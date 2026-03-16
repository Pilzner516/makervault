import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {
  ScreenLayout, ScreenHeader,
  MetricRow, MetricTile,
  EngravingLabel, FieldRow, PanelCard,
  PrimaryButton, SecondaryButton,
  Badge, EmptyState,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { startBuild, completeBuild } from '@/lib/projectEngine';
import type { Project, ProjectPart, Part } from '@/lib/types';

interface ProjectPartWithInventory extends ProjectPart {
  inventoryPart: Part | null;
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parts, fetchParts } = useInventoryStore();

  const [project, setProject] = useState<Project | null>(null);
  const [projectParts, setProjectParts] = useState<ProjectPartWithInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    (async () => {
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectData) {
        setProject(projectData as Project);
      }

      const { data: partsData } = await supabase
        .from('project_parts')
        .select('*')
        .eq('project_id', id);

      if (partsData) {
        const withInventory = (partsData as ProjectPart[]).map((pp) => ({
          ...pp,
          inventoryPart: parts.find((p) => p.id === pp.part_id) ?? null,
        }));
        setProjectParts(withInventory);
      }

      setIsLoading(false);
    })();
  }, [id, parts]);

  if (!project) {
    return (
      <ScreenLayout style={{ paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        {isLoading ? (
          <EmptyState
            icon="hourglass-outline"
            title="Loading..."
          />
        ) : (
          <EmptyState
            icon="alert-circle-outline"
            title="Project not found"
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        )}
      </ScreenLayout>
    );
  }

  const ownedCount = projectParts.filter(
    (pp) => pp.inventoryPart && pp.inventoryPart.quantity >= pp.quantity_needed
  ).length;
  const totalCount = projectParts.length;
  const allPartsOwned = totalCount > 0 && ownedCount === totalCount;

  const handleStartBuild = () => {
    Alert.alert(
      'Start Build',
      'This will mark the project as in-progress. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            const reserves = projectParts
              .filter((pp) => pp.inventoryPart)
              .map((pp) => ({
                partId: pp.part_id,
                quantity: pp.inventoryPart!.quantity,
              }));
            await startBuild(project.id, reserves);
            setProject({ ...project, status: 'in_progress' });
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    Alert.alert(
      'Complete Build',
      'This will deduct consumed parts from your inventory. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            const consumed = projectParts
              .filter((pp) => pp.inventoryPart)
              .map((pp) => ({
                partId: pp.part_id,
                quantityUsed: pp.quantity_needed,
              }));
            await completeBuild(project.id, consumed);
            setProject({ ...project, status: 'completed' });
            await fetchParts();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert('Delete Project', 'Remove this project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('projects').delete().eq('id', project.id);
          router.back();
        },
      },
    ]);
  };

  const getDiffBadgeVariant = (): 'ok' | 'low' | 'out' | undefined => {
    if (!project.difficulty) return undefined;
    if (project.difficulty === 'beginner') return 'ok';
    if (project.difficulty === 'intermediate') return 'low';
    if (project.difficulty === 'advanced') return 'out';
    return undefined;
  };

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={project.title}
        subtitle={project.status.replace('_', ' ')}
        backLabel="Projects"
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={22} color={colors.statusOut} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Metrics */}
        <MetricRow>
          <MetricTile value={ownedCount} label="Owned" color={colors.statusOk} />
          <MetricTile value={totalCount - ownedCount} label="Missing" color={totalCount - ownedCount > 0 ? colors.statusOut : colors.statusOk} />
          <MetricTile value={project.estimated_hours ?? '\u2014'} label="Hours" />
        </MetricRow>

        {/* Project info card */}
        <View style={{
          backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.borderDefault,
          borderRadius: Radius.card, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.lg,
        }}>
          {/* Meta row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm }}>
            {project.difficulty && (
              <Badge variant={getDiffBadgeVariant()!} label={project.difficulty} />
            )}
            {project.estimated_hours != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textMuted }}>{project.estimated_hours}h</Text>
              </View>
            )}
            <Badge variant={project.status === 'completed' ? 'ok' : project.status === 'in_progress' ? 'low' : 'out'} label={project.status.replace('_', ' ')} />
          </View>

          {/* Description */}
          {project.description && (
            <Text style={{ fontSize: FontSize.md, lineHeight: 22, color: colors.textSecondary, marginTop: Spacing.md }}>
              {project.description}
            </Text>
          )}

          {/* Source link */}
          {project.source_url && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md }}
              onPress={() => WebBrowser.openBrowserAsync(project.source_url!)}
            >
              <Ionicons name="open-outline" size={16} color={colors.accent} />
              <Text style={{ fontSize: FontSize.sm, color: colors.accent, textTransform: 'capitalize' }}>
                View on {project.source ?? 'source'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Parts checklist */}
        <EngravingLabel label="Parts checklist" />
        <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.sm, color: colors.textFaint }}>{ownedCount}/{totalCount} owned</Text>
        </View>

        {projectParts.length === 0 ? (
          <Text style={{ fontSize: FontSize.sm, color: colors.textFaint, paddingHorizontal: Spacing.md }}>
            No parts linked
          </Text>
        ) : (
          <PanelCard>
            {projectParts.map((pp, i) => {
              const hasEnough =
                pp.inventoryPart != null &&
                pp.inventoryPart.quantity >= pp.quantity_needed;
              const partName = pp.inventoryPart?.name ?? `Part ${pp.part_id.slice(0, 8)}`;
              const partMeta = `Need ${pp.quantity_needed} \u00B7 Have ${pp.inventoryPart?.quantity ?? 0}`;

              return (
                <View key={pp.id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: Spacing.md, paddingVertical: 13,
                  backgroundColor: colors.bgRow,
                  ...(i < projectParts.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }
                    : {}),
                }}>
                  <Ionicons
                    name={hasEnough ? 'checkmark-circle' : 'cart-outline'}
                    size={20}
                    color={hasEnough ? colors.statusOk : colors.accent}
                  />
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textPrimary }}>{partName}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 }}>{partMeta}</Text>
                  </View>
                  {!hasEnough && (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={{
                        backgroundColor: colors.accentBg, borderRadius: Radius.badge,
                        paddingHorizontal: Spacing.md, paddingVertical: 6,
                      }}
                      onPress={() =>
                        router.push({
                          pathname: '/reorder',
                          params: {
                            mpn: pp.inventoryPart?.mpn ?? '',
                            name: pp.inventoryPart?.name ?? '',
                          },
                        })
                      }
                    >
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '500', color: colors.accent }}>Order</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </PanelCard>
        )}

        {/* Action buttons */}
        <View style={{ marginTop: Spacing.lg }}>
          {project.status === 'idea' && (
            <PrimaryButton
              label={allPartsOwned ? 'Start Build' : 'Start Build (missing parts)'}
              icon="build-outline"
              onPress={handleStartBuild}
            />
          )}

          {project.status === 'in_progress' && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: colors.statusOkBg, borderWidth: 0.5, borderColor: colors.statusOkBorder,
                borderRadius: Radius.icon, paddingVertical: 14, marginHorizontal: Spacing.md, gap: 8,
              }}
              onPress={handleComplete}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.statusOk} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.statusOk }}>Mark Complete</Text>
            </TouchableOpacity>
          )}

          {project.status === 'completed' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.statusOkBg, borderRadius: Radius.icon,
              paddingVertical: 14, marginHorizontal: Spacing.md, gap: 8,
            }}>
              <Ionicons name="trophy-outline" size={20} color={colors.statusOk} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.statusOk }}>Build Complete!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
