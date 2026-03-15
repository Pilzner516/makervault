import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { generateProjectIdeas, searchInstructables } from '@/lib/projectEngine';
import type { AIProjectSuggestion, ExternalProject } from '@/lib/projectEngine';
import type { Project } from '@/lib/types';

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View className="flex-1 bg-screen" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-md pb-sm pt-xl">
        <Text className="text-title text-text-primary">Projects</Text>
      </View>

      {/* Tab bar */}
      <View className="mx-md mb-sm flex-row gap-[5px]">
        {(['ideas', 'saved', 'history'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              className="flex-1 items-center rounded-md py-[6px]"
              style={{
                backgroundColor: isActive ? 'rgba(240,160,48,0.12)' : '#1e1e1e',
                borderWidth: 0.5,
                borderColor: isActive ? '#634010' : '#2a2a2a',
              }}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className="text-meta font-medium capitalize"
                style={{ color: isActive ? '#f0a030' : '#666666' }}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'ideas' && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {/* AI suggestions */}
          <Text className="text-section uppercase px-md py-[6px] text-text-ghost tracking-wider">
            AI SUGGESTIONS
          </Text>

          {isLoadingAI ? (
            <View className="items-center py-xl">
              <ActivityIndicator size="small" color="#f0a030" />
              <Text className="mt-sm text-meta text-text-faint">Analyzing your inventory...</Text>
            </View>
          ) : aiSuggestions.length === 0 ? (
            <View className="mx-md items-center rounded-lg bg-card py-xl" style={{ borderWidth: 0.5, borderColor: '#2a2a2a' }}>
              <MaterialIcons name="lightbulb-outline" size={36} color="#555555" />
              <Text className="mt-sm text-item text-text-ghost">
                {parts.length === 0 ? 'Add parts to get project ideas' : 'No matching ideas'}
              </Text>
              {parts.length > 0 && (
                <Pressable
                  className="mt-sm rounded-md px-lg py-[6px]"
                  style={{ backgroundColor: 'rgba(240,160,48,0.12)', borderWidth: 0.5, borderColor: '#634010' }}
                  onPress={handleGenerateIdeas}
                >
                  <Text className="text-meta font-medium text-amber-500">Regenerate</Text>
                </Pressable>
              )}
            </View>
          ) : (
            aiSuggestions.map((suggestion, i) => (
              <ProjectCard key={`ai-${i}`} suggestion={suggestion} onSave={() => handleSaveProject(suggestion)} />
            ))
          )}

          {/* External projects */}
          <Text className="text-section uppercase px-md py-[6px] mt-lg text-text-ghost tracking-wider">
            FROM INSTRUCTABLES
          </Text>

          {isLoadingExternal ? (
            <ActivityIndicator className="py-lg" size="small" color="#f0a030" />
          ) : externalProjects.length === 0 ? (
            <Text className="mx-md text-meta text-text-ghost">No results</Text>
          ) : (
            externalProjects.map((proj, i) => (
              <Pressable
                key={`ext-${i}`}
                className="flex-row items-center px-md py-sm"
                style={{ borderBottomWidth: 0.5, borderBottomColor: '#1e1e1e' }}
                onPress={() => WebBrowser.openBrowserAsync(proj.url)}
              >
                <View className="flex-1">
                  <Text className="text-item text-text-secondary">{proj.title}</Text>
                  {proj.description && (
                    <Text className="text-meta text-text-muted" numberOfLines={1}>{proj.description}</Text>
                  )}
                </View>
                <MaterialIcons name="open-in-new" size={14} color="#f0a030" />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'saved' && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {activeProjects.length === 0 ? (
            <View className="items-center py-xl">
              <MaterialIcons name="bookmark-outline" size={36} color="#555555" />
              <Text className="mt-sm text-item text-text-ghost">No saved projects</Text>
            </View>
          ) : (
            activeProjects.map((project) => (
              <Pressable
                key={project.id}
                className="mx-md mb-[7px] rounded-lg bg-card p-[10px]"
                style={{ borderWidth: 0.5, borderColor: '#272727' }}
                onPress={() => router.push(`/project/${project.id}`)}
              >
                <View className="flex-row items-start justify-between">
                  <Text className="text-item text-text-secondary flex-1 mr-sm">{project.title}</Text>
                  <DifficultyBadge difficulty={project.difficulty} />
                </View>
                {project.description && (
                  <Text className="text-meta text-text-faint mt-xs" numberOfLines={2}>{project.description}</Text>
                )}
                <View className="mt-[7px] h-[3px] rounded-sm bg-elevated overflow-hidden">
                  <View
                    className="h-full rounded-sm"
                    style={{
                      width: project.status === 'completed' ? '100%' : project.status === 'in_progress' ? '50%' : '0%',
                      backgroundColor: project.status === 'completed' ? '#32b464' : '#f0a030',
                    }}
                  />
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'history' && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {completedProjects.length === 0 ? (
            <View className="items-center py-xl">
              <MaterialIcons name="check-circle-outline" size={36} color="#555555" />
              <Text className="mt-sm text-item text-text-ghost">No completed builds yet</Text>
            </View>
          ) : (
            completedProjects.map((project) => (
              <Pressable
                key={project.id}
                className="flex-row items-center px-md py-sm"
                style={{ borderBottomWidth: 0.5, borderBottomColor: '#1e1e1e' }}
                onPress={() => router.push(`/project/${project.id}`)}
              >
                <MaterialIcons name="check-circle" size={18} color="#32b464" />
                <View className="ml-sm flex-1">
                  <Text className="text-item text-text-secondary">{project.title}</Text>
                  <Text className="text-meta text-text-muted">
                    {new Date(project.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <DifficultyBadge difficulty={project.difficulty} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ProjectCard({ suggestion, onSave }: { suggestion: AIProjectSuggestion; onSave: () => void }) {
  const ownedCount = suggestion.parts_needed.filter((p) => p.user_has).length;
  const totalCount = suggestion.parts_needed.length;
  const matchPct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <View
      className="mx-md mb-[7px] rounded-lg bg-card p-[10px]"
      style={{ borderWidth: 0.5, borderColor: '#272727' }}
    >
      <View className="flex-row items-start justify-between">
        <Text className="text-item text-text-secondary flex-1 mr-sm">{suggestion.title}</Text>
        <DifficultyBadge difficulty={suggestion.difficulty} />
      </View>
      <Text className="text-meta text-text-faint mt-xs" numberOfLines={2}>{suggestion.description}</Text>

      <View className="mt-sm flex-row items-center gap-sm">
        <Text className="text-meta text-text-muted">{suggestion.estimated_hours}h</Text>
        <View className="rounded-sm px-[6px] py-[2px]" style={{ backgroundColor: 'rgba(50,180,100,0.10)' }}>
          <Text className="text-badge" style={{ color: matchPct >= 80 ? '#32b464' : matchPct >= 50 ? '#f0a030' : '#888888' }}>
            {ownedCount}/{totalCount} parts
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="mt-[7px] h-[3px] rounded-sm bg-elevated overflow-hidden">
        <View
          className="h-full rounded-sm"
          style={{
            width: `${matchPct}%`,
            backgroundColor: matchPct >= 80 ? '#32b464' : matchPct >= 50 ? '#f0a030' : '#f05032',
          }}
        />
      </View>

      <Pressable
        className="mt-sm rounded-md py-[9px] items-center"
        style={{ backgroundColor: 'rgba(240,160,48,0.12)', borderWidth: 0.5, borderColor: '#634010' }}
        onPress={onSave}
      >
        <Text className="text-input font-medium text-amber-500">Save & View Details</Text>
      </Pressable>
    </View>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
  const config: Record<string, { bg: string; color: string }> = {
    beginner: { bg: 'rgba(50,180,100,0.10)', color: '#32b464' },
    intermediate: { bg: 'rgba(240,160,48,0.12)', color: '#f0a030' },
    advanced: { bg: 'rgba(240,80,50,0.13)', color: '#f05032' },
  };
  const { bg, color } = config[difficulty] ?? { bg: '#252525', color: '#888888' };
  return (
    <View className="rounded-sm px-[6px] py-[2px]" style={{ backgroundColor: bg }}>
      <Text className="text-badge capitalize" style={{ color }}>{difficulty}</Text>
    </View>
  );
}
