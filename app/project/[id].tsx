import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { startBuild, completeBuild } from '@/lib/projectEngine';
import type { Project, ProjectPart, Part } from '@/lib/types';

interface ProjectPartWithInventory extends ProjectPart {
  inventoryPart: Part | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Project' }} />
        {isLoading ? (
          <Text className="text-base text-zinc-400">Loading...</Text>
        ) : (
          <>
            <MaterialIcons name="error-outline" size={48} color="#a1a1aa" />
            <Text className="mt-3 text-base text-zinc-400">Project not found</Text>
          </>
        )}
      </View>
    );
  }

  const ownedCount = projectParts.filter(
    (pp) => pp.inventoryPart && pp.inventoryPart.quantity >= pp.quantity_needed
  ).length;
  const totalCount = projectParts.length;
  const allPartsOwned = totalCount > 0 && ownedCount === totalCount;

  const diffColor = DIFFICULTY_COLORS[project.difficulty ?? ''] ?? '';
  const [diffBg, diffText] = diffColor.split(' ');

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

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <Stack.Screen
        options={{
          title: project.title,
          headerRight: () => (
            <Pressable onPress={handleDelete} className="mr-2">
              <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Project info */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-5 dark:bg-zinc-800">
          <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {project.title}
          </Text>

          {/* Meta row */}
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            {project.difficulty && (
              <View className={`rounded-full px-2.5 py-0.5 ${diffBg}`}>
                <Text className={`text-xs font-medium capitalize ${diffText}`}>
                  {project.difficulty}
                </Text>
              </View>
            )}
            {project.estimated_hours != null && (
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="schedule" size={14} color="#a1a1aa" />
                <Text className="text-sm text-zinc-500">
                  {project.estimated_hours}h
                </Text>
              </View>
            )}
            <View className="rounded-full bg-primary/10 px-2.5 py-0.5">
              <Text className="text-xs font-medium capitalize text-primary">
                {project.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Description */}
          {project.description && (
            <Text className="mt-3 text-base leading-6 text-zinc-700 dark:text-zinc-300">
              {project.description}
            </Text>
          )}

          {/* Source link */}
          {project.source_url && (
            <Pressable
              className="mt-3 flex-row items-center gap-1.5"
              onPress={() => WebBrowser.openBrowserAsync(project.source_url!)}
            >
              <MaterialIcons name="open-in-new" size={16} color="#0a7ea4" />
              <Text className="text-sm text-primary capitalize">
                View on {project.source ?? 'source'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Parts checklist */}
        <View className="mx-4 mt-3 rounded-xl bg-white p-5 dark:bg-zinc-800">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Parts Checklist
            </Text>
            <Text className="text-sm text-zinc-400">
              {ownedCount}/{totalCount} owned
            </Text>
          </View>

          {projectParts.length === 0 ? (
            <Text className="text-sm text-zinc-400">No parts linked</Text>
          ) : (
            projectParts.map((pp) => {
              const hasEnough =
                pp.inventoryPart != null &&
                pp.inventoryPart.quantity >= pp.quantity_needed;

              return (
                <View
                  key={pp.id}
                  className="flex-row items-center border-b border-zinc-100 py-3 last:border-b-0 dark:border-zinc-700"
                >
                  <MaterialIcons
                    name={hasEnough ? 'check-circle' : 'shopping-cart'}
                    size={20}
                    color={hasEnough ? '#22c55e' : '#f59e0b'}
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-base text-zinc-900 dark:text-zinc-100">
                      {pp.inventoryPart?.name ?? `Part ${pp.part_id.slice(0, 8)}`}
                    </Text>
                    <Text className="text-xs text-zinc-500">
                      Need {pp.quantity_needed} · Have{' '}
                      {pp.inventoryPart?.quantity ?? 0}
                    </Text>
                  </View>
                  {!hasEnough && (
                    <Pressable
                      className="rounded-lg bg-warning/10 px-3 py-1.5"
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
                      <Text className="text-xs font-medium text-warning">
                        Order
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Action buttons */}
        <View className="mx-4 mt-4 gap-3">
          {project.status === 'idea' && (
            <Pressable
              className={`flex-row items-center justify-center rounded-xl py-4 ${
                allPartsOwned ? 'bg-primary' : 'bg-primary/60'
              }`}
              onPress={handleStartBuild}
            >
              <MaterialIcons name="build" size={20} color="#fff" />
              <Text className="ml-2 text-base font-semibold text-white">
                {allPartsOwned ? 'Start Build' : 'Start Build (missing parts)'}
              </Text>
            </Pressable>
          )}

          {project.status === 'in_progress' && (
            <Pressable
              className="flex-row items-center justify-center rounded-xl bg-green-500 py-4"
              onPress={handleComplete}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text className="ml-2 text-base font-semibold text-white">
                Mark Complete
              </Text>
            </Pressable>
          )}

          {project.status === 'completed' && (
            <View className="flex-row items-center justify-center rounded-xl bg-green-100 py-4 dark:bg-green-900/30">
              <MaterialIcons name="celebration" size={20} color="#22c55e" />
              <Text className="ml-2 text-base font-semibold text-green-700 dark:text-green-400">
                Build Complete!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
