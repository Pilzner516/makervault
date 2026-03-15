import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { StorageLocation } from '@/lib/types';

interface LocationTreeProps {
  locations: StorageLocation[];
  onSelect: (location: StorageLocation) => void;
  onEdit: (location: StorageLocation) => void;
  selectedId?: string;
}

interface TreeNodeProps {
  location: StorageLocation;
  children: StorageLocation[];
  allLocations: StorageLocation[];
  depth: number;
  onSelect: (location: StorageLocation) => void;
  onEdit: (location: StorageLocation) => void;
  selectedId?: string;
}

function TreeNode({
  location,
  children,
  allLocations,
  depth,
  onSelect,
  onEdit,
  selectedId,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === location.id;

  return (
    <View>
      <Pressable
        className={`flex-row items-center rounded-lg px-3 py-3 ${
          isSelected ? 'bg-primary/10' : ''
        }`}
        style={{ paddingLeft: 12 + depth * 24 }}
        onPress={() => onSelect(location)}
      >
        {hasChildren ? (
          <Pressable onPress={() => setExpanded(!expanded)} className="mr-2">
            <MaterialIcons
              name={expanded ? 'expand-more' : 'chevron-right'}
              size={20}
              color="#71717a"
            />
          </Pressable>
        ) : (
          <View className="mr-2 w-5" />
        )}

        <MaterialIcons
          name={hasChildren ? 'folder' : 'inventory-2'}
          size={20}
          color={isSelected ? '#0a7ea4' : '#71717a'}
        />
        <Text
          className={`ml-2 flex-1 text-base ${
            isSelected
              ? 'font-semibold text-primary'
              : 'text-zinc-900 dark:text-zinc-100'
          }`}
        >
          {location.name}
        </Text>

        <Pressable
          className="rounded-full p-1"
          onPress={() => onEdit(location)}
        >
          <MaterialIcons name="more-vert" size={20} color="#71717a" />
        </Pressable>
      </Pressable>

      {expanded &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            location={child}
            children={allLocations.filter((l) => l.parent_id === child.id)}
            allLocations={allLocations}
            depth={depth + 1}
            onSelect={onSelect}
            onEdit={onEdit}
            selectedId={selectedId}
          />
        ))}
    </View>
  );
}

export function LocationTree({
  locations,
  onSelect,
  onEdit,
  selectedId,
}: LocationTreeProps) {
  const rootLocations = locations.filter((l) => !l.parent_id);

  if (locations.length === 0) {
    return (
      <View className="items-center py-12">
        <MaterialIcons name="inventory-2" size={48} color="#a1a1aa" />
        <Text className="mt-3 text-base text-zinc-400">
          No storage locations yet
        </Text>
        <Text className="mt-1 text-sm text-zinc-400">
          Add a location to organize your parts
        </Text>
      </View>
    );
  }

  return (
    <View>
      {rootLocations.map((root) => (
        <TreeNode
          key={root.id}
          location={root}
          children={locations.filter((l) => l.parent_id === root.id)}
          allLocations={locations}
          depth={0}
          onSelect={onSelect}
          onEdit={onEdit}
          selectedId={selectedId}
        />
      ))}
    </View>
  );
}
