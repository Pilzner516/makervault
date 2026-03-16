import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {
  ScreenLayout, ScreenHeader, ModeButton,
  EngravingLabel, ProjectCard, EmptyState,
  PrimaryButton, Badge, PanelCard,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { generateProjectIdeas, searchInstructables } from '@/lib/projectEngine';
import type { AIProjectSuggestion, ExternalProject } from '@/lib/projectEngine';
import type { Project } from '@/lib/types';

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parts } = useInventoryStore();

  const [aiSuggestions, setAiSuggestions] = useState<AIProjectSuggestion[]>([]);
  const [externalProjects, setExternalProjects] = useState<ExternalProject[]>([]);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ideas' | 'saved' | 'history'>('ideas');

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSavedProjects(data as Project[]);
      });
  }, []);

  const handleGenerateIdeas = useCallback(async () => {
    if (parts.length === 0) return;
    setIsLoadingAI(true);
    try {
      const ideas = await generateProjectIdeas(parts);
      setAiSuggestions(ideas);
    } catch {
      // Silently fail
    } finally {
      setIsLoadingAI(false);
    }
  }, [parts]);

  const handleSearchExternal = useCallback(async () => {
    setIsLoadingExternal(true);
    const topParts = parts.slice(0, 3).map((p) => p.name);
    const query = topParts.join(' ') || 'arduino beginner';
    try {
      const results = await searchInstructables(query);
      setExternalProjects(results);
    } catch {
      // Silently fail
    } finally {
      setIsLoadingExternal(false);
    }
  }, [parts]);

  useEffect(() => {
    handleGenerateIdeas();
    handleSearchExternal();
  }, [handleGenerateIdeas, handleSearchExternal]);

  const completedProjects = savedProjects.filter((p) => p.status === 'completed');
  const activeProjects = savedProjects.filter((p) => p.status === 'idea' || p.status === 'in_progress');

  const handleSaveProject = async (suggestion: AIProjectSuggestion) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: suggestion.title,
        description: suggestion.description,
        difficulty: suggestion.difficulty,
        estimated_hours: suggestion.estimated_hours,
        source: 'ai_generated',
        source_url: null,
        status: 'idea',
      })
      .select()
      .single();

    if (!error && data) {
      setSavedProjects((prev) => [data as Project, ...prev]);
      for (const part of suggestion.parts_needed) {
        const inventoryPart = parts.find((p) =>
          p.name.toLowerCase().includes(part.name.toLowerCase())
        );
        if (inventoryPart) {
          await supabase.from('project_parts').insert({
            project_id: (data as Project).id,
            part_id: inventoryPart.id,
            quantity_needed: part.quantity,
            quantity_owned: inventoryPart.quantity,
          });
        }
      }
      router.push(`/project/${(data as Project).id}`);
    }
  };

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Projects"
        subtitle={`${savedProjects.length} saved \u00B7 ${activeProjects.length} active`}
      />

      {/* Tab bar — compact row */}
      <View style={{ flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, gap: 6 }}>
        {(['ideas', 'saved', 'history'] as const).map((tab) => (
          <ModeButton
            key={tab}
            label={tab.charAt(0).toUpperCase() + tab.slice(1)}
            active={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>

      {activeTab === 'ideas' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {/* AI suggestions */}
          <EngravingLabel label="AI suggestions" />

          {isLoadingAI ? (
            <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, marginTop: Spacing.sm }}>
                Analyzing your inventory...
              </Text>
            </View>
          ) : aiSuggestions.length === 0 ? (
            <EmptyState
              icon="sparkles"
              title={parts.length === 0 ? 'Add parts to get project ideas' : 'No matching ideas'}
              actionLabel={parts.length > 0 ? 'Regenerate' : undefined}
              onAction={parts.length > 0 ? handleGenerateIdeas : undefined}
            />
          ) : (
            aiSuggestions.map((suggestion, i) => {
              const ownedCount = suggestion.parts_needed.filter((p) => p.user_has).length;
              const totalCount = suggestion.parts_needed.length;
              return (
                <AIProjectCardView
                  key={`ai-${i}`}
                  suggestion={suggestion}
                  ownedCount={ownedCount}
                  totalCount={totalCount}
                  onSave={() => handleSaveProject(suggestion)}
                />
              );
            })
          )}

          {/* External projects */}
          <EngravingLabel label="From Instructables" />

          {isLoadingExternal ? (
            <View style={{ paddingVertical: Spacing.lg }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : externalProjects.length === 0 ? (
            <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, paddingHorizontal: Spacing.md }}>
              No results
            </Text>
          ) : (
            <PanelCard>
              {externalProjects.map((proj, i) => (
                <TouchableOpacity
                  key={`ext-${i}`}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 13,
                    backgroundColor: colors.bgRow,
                    gap: Spacing.sm,
                    ...(i < externalProjects.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }
                      : {}),
                  }}
                  onPress={() => WebBrowser.openBrowserAsync(proj.url)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary }} numberOfLines={1}>
                      {proj.title}
                    </Text>
                    {proj.description && (
                      <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, marginTop: 2 }} numberOfLines={1}>
                        {proj.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="open-outline" size={16} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </PanelCard>
          )}
        </ScrollView>
      )}

      {activeTab === 'saved' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: Spacing.sm }}>
          {activeProjects.length === 0 ? (
            <EmptyState
              icon="bookmark-outline"
              title="No saved projects"
              subtitle="Save an AI suggestion or create a project to get started"
            />
          ) : (
            activeProjects.map((project) => {
              const pct = project.status === 'completed' ? 1 : project.status === 'in_progress' ? 0.5 : 0;
              return (
                <TouchableOpacity
                  key={project.id}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: colors.bgCard,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    borderRadius: Radius.card,
                    marginHorizontal: Spacing.md,
                    marginBottom: Spacing.sm,
                    padding: Spacing.md,
                  }}
                  onPress={() => router.push(`/project/${project.id}`)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary, flex: 1, marginRight: Spacing.sm }} numberOfLines={1}>
                      {project.title}
                    </Text>
                    <DifficultyBadge difficulty={project.difficulty} />
                  </View>
                  {project.description && (
                    <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, marginBottom: Spacing.sm }} numberOfLines={2}>
                      {project.description}
                    </Text>
                  )}
                  <View style={{ height: 4, backgroundColor: colors.bgRow, borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                    <View
                      style={{
                        height: '100%',
                        borderRadius: 2,
                        width: `${Math.round(pct * 100)}%` as unknown as number,
                        backgroundColor: project.status === 'completed' ? colors.statusOk : colors.accent,
                      }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {activeTab === 'history' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: Spacing.sm }}>
          {completedProjects.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="No completed builds yet"
              subtitle="Complete a project build to see it here"
            />
          ) : (
            <PanelCard>
              {completedProjects.map((project, i) => (
                <TouchableOpacity
                  key={project.id}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 13,
                    backgroundColor: colors.bgRow,
                    ...(i < completedProjects.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }
                      : {}),
                  }}
                  onPress={() => router.push(`/project/${project.id}`)}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.statusOk} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary }}>
                      {project.title}
                    </Text>
                    <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, marginTop: 2 }}>
                      {new Date(project.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <DifficultyBadge difficulty={project.difficulty} />
                </TouchableOpacity>
              ))}
            </PanelCard>
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

function AIProjectCardView({
  suggestion,
  ownedCount,
  totalCount,
  onSave,
}: {
  suggestion: AIProjectSuggestion;
  ownedCount: number;
  totalCount: number;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  const matchPct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  const progressColor = matchPct >= 80 ? colors.statusOk : matchPct >= 50 ? colors.accent : colors.statusOut;

  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: Radius.card,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary, flex: 1, marginRight: Spacing.sm }} numberOfLines={1}>
          {suggestion.title}
        </Text>
        <DifficultyBadge difficulty={suggestion.difficulty} />
      </View>
      <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, marginBottom: Spacing.sm }} numberOfLines={2}>
        {suggestion.description}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
        <Text style={{ fontSize: FontSize.sm, color: colors.textMuted }}>{suggestion.estimated_hours}h</Text>
        <View style={{ backgroundColor: colors.statusOkBg, borderRadius: Radius.badge, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{
            fontSize: FontSize.xs,
            fontWeight: '600',
            color: matchPct >= 80 ? colors.statusOk : matchPct >= 50 ? colors.accent : colors.textMuted,
          }}>
            {ownedCount}/{totalCount} parts
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ height: 4, backgroundColor: colors.bgRow, borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
        <View
          style={{
            height: '100%',
            borderRadius: 2,
            width: `${matchPct}%` as unknown as number,
            backgroundColor: progressColor,
          }}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.75}
        style={{
          backgroundColor: colors.accentBg,
          borderWidth: 0.5,
          borderColor: colors.accentBorder,
          borderRadius: Radius.icon,
          paddingVertical: 10,
          alignItems: 'center',
          marginTop: Spacing.sm,
        }}
        onPress={onSave}
      >
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.accent }}>Save & View Details</Text>
      </TouchableOpacity>
    </View>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  const { colors } = useTheme();
  if (!difficulty) return null;
  const config: Record<string, { bg: string; color: string }> = {
    beginner: { bg: colors.statusOkBg, color: colors.statusOk },
    intermediate: { bg: colors.statusLowBg, color: colors.statusLow },
    advanced: { bg: colors.statusOutBg, color: colors.statusOut },
  };
  const { bg, color } = config[difficulty] ?? { bg: colors.bgSurface, color: colors.textMuted };
  return (
    <View style={{ backgroundColor: bg, borderRadius: Radius.badge, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color, textTransform: 'capitalize' }}>{difficulty}</Text>
    </View>
  );
}
