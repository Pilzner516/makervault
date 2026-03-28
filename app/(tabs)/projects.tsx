import {
  View, Text, ScrollView, TouchableOpacity,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenLayout, ScreenHeader,
  EngravingLabel, PanelCard, EmptyState,
  FilterPill, FilterPillRow,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';
import { getCategoryColor } from '@/lib/categoryColors';
import type { Project } from '@/lib/types';

// ── Project categories for discovery ────────────────────────────────────────

const PROJECT_CATEGORIES = [
  'All', 'Robotics', 'Home Automation', 'Lighting', 'IoT',
  'Audio', 'Wearables', 'Tools', 'Art & Decor',
] as const;
type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

const DIFFICULTY_LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'] as const;
type DifficultyFilter = (typeof DIFFICULTY_LEVELS)[number];

// ── Curated project catalog ─────────────────────────────────────────────────

interface CuratedProject {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  parts_needed: string[];
  source_url?: string;
  source?: 'instructables' | 'hackster' | 'community';
  image_keyword?: string;
  trending?: boolean;
}

const CURATED_PROJECTS: CuratedProject[] = [
  // ── Trending ────────────────────────────────────────
  {
    id: 'cp-01', title: 'WiFi Weather Station',
    description: 'Build a real-time weather station with temperature, humidity, and barometric pressure displayed on an OLED screen and pushed to a web dashboard.',
    category: 'IoT', difficulty: 'intermediate', estimated_hours: 4,
    parts_needed: ['ESP32', 'BME280', 'OLED Display', 'Breadboard', 'Jumper Wires', 'USB Cable', 'Resistor 10K'],
    source: 'community', trending: true,
  },
  {
    id: 'cp-02', title: 'LED Matrix Pixel Art Display',
    description: 'Create a programmable 16x16 LED matrix that displays pixel art, animations, and scrolling text controlled via Bluetooth.',
    category: 'Lighting', difficulty: 'intermediate', estimated_hours: 6,
    parts_needed: ['Arduino Nano', 'WS2812B LED Strip', 'Capacitor 1000uF', 'Resistor 470', 'Power Supply 5V', 'Breadboard', 'Jumper Wires'],
    source: 'instructables', source_url: 'https://www.instructables.com', trending: true,
  },
  {
    id: 'cp-03', title: 'Voice-Controlled Smart Lamp',
    description: 'A 3D-printed lamp with addressable LEDs that responds to voice commands for color and brightness using an ESP32 and microphone module.',
    category: 'Home Automation', difficulty: 'advanced', estimated_hours: 10,
    parts_needed: ['ESP32', 'INMP441 Microphone', 'WS2812B LED Strip', 'Power Supply 5V', 'Capacitor 1000uF', '3D Printed Parts', 'USB Cable'],
    source: 'hackster', source_url: 'https://www.hackster.io', trending: true,
  },
  {
    id: 'cp-04', title: 'Line-Following Robot',
    description: 'A classic beginner robotics project: build a small robot that follows a black line on white paper using IR sensors and DC motors.',
    category: 'Robotics', difficulty: 'beginner', estimated_hours: 3,
    parts_needed: ['Arduino Uno', 'Motor Driver L298N', 'DC Motor', 'IR Sensor', 'Battery Pack', 'Chassis Kit', 'Jumper Wires', 'Breadboard'],
    source: 'instructables', source_url: 'https://www.instructables.com', trending: true,
  },
  // ── Robotics ────────────────────────────────────────
  {
    id: 'cp-05', title: 'Obstacle-Avoiding Robot',
    description: 'Build a wheeled robot that uses an ultrasonic sensor to detect and avoid obstacles autonomously.',
    category: 'Robotics', difficulty: 'intermediate', estimated_hours: 5,
    parts_needed: ['Arduino Uno', 'Ultrasonic Sensor HC-SR04', 'Motor Driver L298N', 'DC Motor', 'Servo Motor', 'Battery Pack', 'Chassis Kit', 'Jumper Wires'],
    source: 'community',
  },
  {
    id: 'cp-06', title: 'Robotic Arm with Servo Control',
    description: 'A 4-DOF robotic arm controlled with potentiometers or a joystick. Great for learning servo control and kinematics.',
    category: 'Robotics', difficulty: 'advanced', estimated_hours: 12,
    parts_needed: ['Arduino Mega', 'Servo Motor', 'Potentiometer', 'Breadboard', 'Jumper Wires', 'Acrylic Sheets', 'Bolts & Screws', 'Power Supply 5V'],
    source: 'community',
  },
  // ── Home Automation ─────────────────────────────────
  {
    id: 'cp-07', title: 'Smart Plant Watering System',
    description: 'Automatically water your plants based on soil moisture readings. Get alerts on your phone when the reservoir is low.',
    category: 'Home Automation', difficulty: 'beginner', estimated_hours: 2,
    parts_needed: ['Arduino Nano', 'Soil Moisture Sensor', 'Relay Module', 'Water Pump', 'Tubing', 'Jumper Wires', 'USB Cable'],
    source: 'instructables', source_url: 'https://www.instructables.com',
  },
  {
    id: 'cp-08', title: 'Motion-Activated Night Light',
    description: 'A PIR sensor triggers warm-white LEDs when motion is detected. Auto-off after 30 seconds. Perfect for hallways.',
    category: 'Home Automation', difficulty: 'beginner', estimated_hours: 1,
    parts_needed: ['PIR Sensor', 'LED Strip', 'MOSFET', 'Resistor 10K', 'Battery Pack', 'Jumper Wires'],
    source: 'community',
  },
  {
    id: 'cp-09', title: 'ESP32 Home Dashboard',
    description: 'A touchscreen-based home dashboard showing time, weather, calendar events, and smart device controls using an ESP32 and TFT display.',
    category: 'Home Automation', difficulty: 'advanced', estimated_hours: 8,
    parts_needed: ['ESP32', 'TFT Display', 'Resistor 10K', 'Breadboard', 'Jumper Wires', 'USB Cable', '3D Printed Enclosure'],
    source: 'hackster', source_url: 'https://www.hackster.io',
  },
  // ── Lighting ────────────────────────────────────────
  {
    id: 'cp-10', title: 'Mood Lighting Controller',
    description: 'Control RGB LED strips with smooth color transitions and preset moods via a rotary encoder and OLED menu.',
    category: 'Lighting', difficulty: 'intermediate', estimated_hours: 3,
    parts_needed: ['Arduino Nano', 'WS2812B LED Strip', 'Rotary Encoder', 'OLED Display', 'Capacitor 1000uF', 'Breadboard', 'Jumper Wires'],
    source: 'community',
  },
  {
    id: 'cp-11', title: 'LED Desk Lamp with Touch Dimmer',
    description: 'A minimalist desk lamp using high-power LEDs and a capacitive touch sensor for dimming. Clean PCB design included.',
    category: 'Lighting', difficulty: 'beginner', estimated_hours: 2,
    parts_needed: ['LED', 'MOSFET', 'Capacitive Touch Sensor', 'Resistor 470', 'Power Supply 12V', 'PCB', 'Enclosure'],
    source: 'community',
  },
  // ── IoT ─────────────────────────────────────────────
  {
    id: 'cp-12', title: 'MQTT Door Sensor',
    description: 'A battery-powered door/window sensor that publishes open/close events over MQTT to Home Assistant or Node-RED.',
    category: 'IoT', difficulty: 'intermediate', estimated_hours: 3,
    parts_needed: ['ESP8266', 'Reed Switch', 'Magnet', 'Battery Holder', 'Resistor 10K', 'PCB'],
    source: 'community',
  },
  {
    id: 'cp-13', title: 'Air Quality Monitor',
    description: 'Monitor CO2, VOCs, temperature, and humidity with an ESP32 and display the data on a web interface in real time.',
    category: 'IoT', difficulty: 'intermediate', estimated_hours: 5,
    parts_needed: ['ESP32', 'CCS811 Sensor', 'BME280', 'OLED Display', 'Breadboard', 'Jumper Wires', 'USB Cable'],
    source: 'hackster', source_url: 'https://www.hackster.io',
  },
  // ── Audio ───────────────────────────────────────────
  {
    id: 'cp-14', title: 'Bluetooth Speaker',
    description: 'Build a portable Bluetooth speaker with a Class-D amplifier, 18650 battery, and a 3D-printed enclosure.',
    category: 'Audio', difficulty: 'intermediate', estimated_hours: 6,
    parts_needed: ['Bluetooth Audio Module', 'Class-D Amplifier', 'Speaker Driver', '18650 Battery', 'TP4056 Charger', 'Toggle Switch', '3D Printed Parts'],
    source: 'instructables', source_url: 'https://www.instructables.com',
  },
  {
    id: 'cp-15', title: 'Arduino Synthesizer',
    description: 'A simple monophonic synthesizer with tone generation, a few buttons for notes, and a potentiometer for pitch bend.',
    category: 'Audio', difficulty: 'beginner', estimated_hours: 2,
    parts_needed: ['Arduino Uno', 'Piezo Buzzer', 'Push Button', 'Potentiometer', 'Resistor 10K', 'Breadboard', 'Jumper Wires'],
    source: 'community',
  },
  // ── Wearables ───────────────────────────────────────
  {
    id: 'cp-16', title: 'NeoPixel LED Bracelet',
    description: 'A flexible bracelet with individually addressable LEDs and a tiny microcontroller. Multiple animation patterns included.',
    category: 'Wearables', difficulty: 'beginner', estimated_hours: 2,
    parts_needed: ['Adafruit Gemma', 'NeoPixel Ring', 'LiPo Battery', 'Conductive Thread', 'Fabric', 'USB Cable'],
    source: 'instructables', source_url: 'https://www.instructables.com',
  },
  {
    id: 'cp-17', title: 'Fitness Tracker with OLED',
    description: 'A wrist-mounted step counter and heart-rate display using an accelerometer, pulse sensor, and tiny OLED screen.',
    category: 'Wearables', difficulty: 'advanced', estimated_hours: 10,
    parts_needed: ['Arduino Pro Mini', 'MPU6050', 'Pulse Sensor', 'OLED Display', 'LiPo Battery', 'Strap', 'Jumper Wires'],
    source: 'community',
  },
  // ── Tools ───────────────────────────────────────────
  {
    id: 'cp-18', title: 'Component Tester',
    description: 'Build a handheld device that identifies and measures resistors, capacitors, diodes, and transistors with an LCD readout.',
    category: 'Tools', difficulty: 'intermediate', estimated_hours: 4,
    parts_needed: ['ATmega328P', 'LCD 16x2', 'Test Socket', 'Resistor 680', 'Resistor 470K', 'Capacitor 100nF', 'PCB', 'Enclosure'],
    source: 'community',
  },
  {
    id: 'cp-19', title: 'USB Bench Power Supply',
    description: 'Convert an old ATX power supply into a bench supply with banana jacks, USB ports, voltage display, and adjustable output.',
    category: 'Tools', difficulty: 'intermediate', estimated_hours: 3,
    parts_needed: ['ATX Power Supply', 'Banana Jack', 'Voltage Display Module', 'Toggle Switch', 'USB Port', 'Enclosure', 'Wire'],
    source: 'instructables', source_url: 'https://www.instructables.com',
  },
  // ── Art & Decor ─────────────────────────────────────
  {
    id: 'cp-20', title: 'PCB Art Coaster Set',
    description: 'Design custom PCB coasters with artistic circuit traces, silk-screen artwork, and gold ENIG finish. Functional art for your desk.',
    category: 'Art & Decor', difficulty: 'beginner', estimated_hours: 2,
    parts_needed: ['PCB', 'Rubber Feet'],
    source: 'community',
  },
  {
    id: 'cp-21', title: 'LED Infinity Mirror',
    description: 'Build a mesmerizing depth illusion using two-way mirror glass, an LED strip, and a regular mirror in a picture frame.',
    category: 'Art & Decor', difficulty: 'beginner', estimated_hours: 3,
    parts_needed: ['WS2812B LED Strip', 'Two-Way Mirror', 'Mirror', 'Picture Frame', 'Power Supply 5V', 'Arduino Nano'],
    source: 'instructables', source_url: 'https://www.instructables.com',
  },
  {
    id: 'cp-22', title: 'Word Clock',
    description: 'A wall clock that spells out the time in words using a grid of letters and individually controlled LEDs behind a frosted panel.',
    category: 'Art & Decor', difficulty: 'advanced', estimated_hours: 15,
    parts_needed: ['Arduino Uno', 'WS2812B LED Strip', 'RTC Module DS3231', 'Laser-Cut Panel', 'Frosted Acrylic', 'Power Supply 5V', 'Wires', 'Frame'],
    source: 'community',
  },
  {
    id: 'cp-23', title: 'Sound-Reactive LED Panel',
    description: 'A wall-mounted panel of LEDs that reacts to music in real time using an MSGEQ7 audio spectrum analyzer.',
    category: 'Art & Decor', difficulty: 'intermediate', estimated_hours: 6,
    parts_needed: ['Arduino Uno', 'MSGEQ7', 'WS2812B LED Strip', 'Audio Jack 3.5mm', 'Capacitor 33pF', 'Resistor 200K', 'Power Supply 5V', 'Enclosure'],
    source: 'hackster', source_url: 'https://www.hackster.io',
  },
  // ── More beginner/quick builds ──────────────────────
  {
    id: 'cp-24', title: 'Blinking LED Circuit',
    description: 'The classic first electronics project. Learn to blink an LED with a 555 timer or Arduino. Great for absolute beginners.',
    category: 'Lighting', difficulty: 'beginner', estimated_hours: 0.5,
    parts_needed: ['LED', 'Resistor 470', 'Breadboard', 'Battery Pack', 'Jumper Wires'],
    source: 'community',
  },
  {
    id: 'cp-25', title: 'Temperature & Humidity Display',
    description: 'Read temperature and humidity from a DHT22 sensor and show the values on a 16x2 LCD. Simple I2C wiring.',
    category: 'IoT', difficulty: 'beginner', estimated_hours: 1,
    parts_needed: ['Arduino Uno', 'DHT22', 'LCD 16x2', 'Potentiometer', 'Breadboard', 'Jumper Wires'],
    source: 'community',
  },
  {
    id: 'cp-26', title: 'Simon Says Game',
    description: 'Recreate the classic memory game with 4 colored LEDs, buttons, and a piezo buzzer. Fun intro to arrays and game logic.',
    category: 'Art & Decor', difficulty: 'beginner', estimated_hours: 2,
    parts_needed: ['Arduino Uno', 'LED', 'Push Button', 'Piezo Buzzer', 'Resistor 470', 'Breadboard', 'Jumper Wires'],
    source: 'community',
  },
  {
    id: 'cp-27', title: 'Ultrasonic Distance Display',
    description: 'Measure distance with an HC-SR04 ultrasonic sensor and display the result on an OLED screen. No soldering needed.',
    category: 'Tools', difficulty: 'beginner', estimated_hours: 1,
    parts_needed: ['Arduino Nano', 'Ultrasonic Sensor HC-SR04', 'OLED Display', 'Breadboard', 'Jumper Wires'],
    source: 'community',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function matchPartsToInventory(
  partsNeeded: string[],
  inventory: { name: string; category: string | null }[],
): { owned: number; total: number } {
  let owned = 0;
  for (const needed of partsNeeded) {
    const lower = needed.toLowerCase();
    const found = inventory.some(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        lower.includes(p.name.toLowerCase()),
    );
    if (found) owned++;
  }
  return { owned, total: partsNeeded.length };
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Robotics: '#e879f9',
  'Home Automation': '#38bdf8',
  Lighting: '#facc15',
  IoT: '#00c8e8',
  Audio: '#f97316',
  Wearables: '#a78bfa',
  Tools: '#32d47a',
  'Art & Decor': '#f472b6',
};

function getProjectCategoryColor(category: string): string {
  return CATEGORY_COLOR_MAP[category] ?? getCategoryColor(category);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parts } = useInventoryStore();

  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All Levels');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);

  // Load user's saved projects from Supabase
  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSavedProjects(data as Project[]);
          const ids = new Set<string>();
          for (const p of data as Project[]) {
            // match saved projects by title to curated projects
            const match = CURATED_PROJECTS.find(
              (cp) => cp.title.toLowerCase() === p.title.toLowerCase(),
            );
            if (match) ids.add(match.id);
          }
          setSavedIds(ids);
        }
      });
  }, []);

  // ── Compute match percentages for all curated projects ──────────────────

  const projectsWithMatch = useMemo(() => {
    return CURATED_PROJECTS.map((cp) => {
      const { owned, total } = matchPartsToInventory(cp.parts_needed, parts);
      return { ...cp, ownedCount: owned, totalCount: total, matchPct: total > 0 ? Math.round((owned / total) * 100) : 0 };
    });
  }, [parts]);

  // ── Apply filters ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return projectsWithMatch.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (difficultyFilter !== 'All Levels' && p.difficulty !== difficultyFilter.toLowerCase()) return false;
      return true;
    });
  }, [projectsWithMatch, categoryFilter, difficultyFilter]);

  // ── Section buckets ───────────────────────────────────────────────────────

  const trending = useMemo(() => filtered.filter((p) => p.trending), [filtered]);
  const matched = useMemo(
    () => [...filtered].filter((p) => p.matchPct > 0).sort((a, b) => b.matchPct - a.matchPct),
    [filtered],
  );
  const quickBuilds = useMemo(
    () => filtered.filter((p) => p.estimated_hours <= 2 && p.difficulty === 'beginner'),
    [filtered],
  );
  const saved = useMemo(
    () => filtered.filter((p) => savedIds.has(p.id)),
    [filtered, savedIds],
  );

  // ── Bookmark handler ──────────────────────────────────────────────────────

  const handleBookmark = useCallback(
    async (project: CuratedProject) => {
      if (savedIds.has(project.id)) {
        // Un-save: remove from Supabase
        const match = savedProjects.find(
          (sp) => sp.title.toLowerCase() === project.title.toLowerCase(),
        );
        if (match) {
          await supabase.from('projects').delete().eq('id', match.id);
          setSavedProjects((prev) => prev.filter((sp) => sp.id !== match.id));
        }
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
      } else {
        // Save to Supabase
        const { data, error } = await supabase
          .from('projects')
          .insert({
            title: project.title,
            description: project.description,
            difficulty: project.difficulty,
            estimated_hours: project.estimated_hours,
            source: project.source ?? 'ai_generated',
            source_url: project.source_url ?? null,
            status: 'idea',
          })
          .select()
          .single();

        if (!error && data) {
          setSavedProjects((prev) => [data as Project, ...prev]);
          setSavedIds((prev) => new Set(prev).add(project.id));
        }
      }
    },
    [savedIds, savedProjects],
  );

  // ── Navigate to project detail ────────────────────────────────────────────

  const handleOpenProject = useCallback(
    (project: CuratedProject) => {
      const match = savedProjects.find(
        (sp) => sp.title.toLowerCase() === project.title.toLowerCase(),
      );
      if (match) {
        router.push(`/project/${match.id}`);
      } else {
        // Save first, then navigate
        handleBookmark(project).then(() => {
          // Re-check after save
          supabase
            .from('projects')
            .select('*')
            .ilike('title', project.title)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data }) => {
              if (data) router.push(`/project/${(data as Project).id}`);
            });
        });
      }
    },
    [savedProjects, router, handleBookmark],
  );

  // ── Determine if any section has content ──────────────────────────────────

  const hasAnyContent = trending.length > 0 || matched.length > 0 || quickBuilds.length > 0 || saved.length > 0;

  // ── Stat counts ───────────────────────────────────────────────────────────

  const savedCount = savedIds.size;
  const matchedCount = projectsWithMatch.filter((p) => p.matchPct > 0).length;

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Projects"
        subtitle={`${CURATED_PROJECTS.length} projects \u00B7 ${matchedCount} match your parts`}
      />

      {/* Category filter pills */}
      <FilterPillRow>
        {PROJECT_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat}
            label={cat}
            active={categoryFilter === cat}
            onPress={() => setCategoryFilter(cat)}
          />
        ))}
      </FilterPillRow>

      {/* Difficulty filter pills */}
      <FilterPillRow>
        {DIFFICULTY_LEVELS.map((level) => (
          <FilterPill
            key={level}
            label={level}
            active={difficultyFilter === level}
            onPress={() => setDifficultyFilter(level)}
          />
        ))}
      </FilterPillRow>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {!hasAnyContent && (
          <EmptyState
            icon="flask-outline"
            title="No projects match these filters"
            subtitle="Try broadening your category or difficulty filter"
          />
        )}

        {/* Trending */}
        {trending.length > 0 && (
          <>
            <EngravingLabel label="Trending" />
            {trending.map((p) => (
              <DiscoveryProjectCard
                key={p.id}
                project={p}
                ownedCount={p.ownedCount}
                totalCount={p.totalCount}
                matchPct={p.matchPct}
                isSaved={savedIds.has(p.id)}
                onBookmark={() => handleBookmark(p)}
                onPress={() => handleOpenProject(p)}
              />
            ))}
          </>
        )}

        {/* Matched to Your Parts */}
        {matched.length > 0 && (
          <>
            <EngravingLabel label="Matched to your parts" />
            {matched.map((p) => (
              <DiscoveryProjectCard
                key={`match-${p.id}`}
                project={p}
                ownedCount={p.ownedCount}
                totalCount={p.totalCount}
                matchPct={p.matchPct}
                isSaved={savedIds.has(p.id)}
                onBookmark={() => handleBookmark(p)}
                onPress={() => handleOpenProject(p)}
              />
            ))}
          </>
        )}

        {/* Quick Builds */}
        {quickBuilds.length > 0 && (
          <>
            <EngravingLabel label="Quick builds" />
            {quickBuilds.map((p) => (
              <DiscoveryProjectCard
                key={`quick-${p.id}`}
                project={p}
                ownedCount={p.ownedCount}
                totalCount={p.totalCount}
                matchPct={p.matchPct}
                isSaved={savedIds.has(p.id)}
                onBookmark={() => handleBookmark(p)}
                onPress={() => handleOpenProject(p)}
              />
            ))}
          </>
        )}

        {/* Saved Projects */}
        {saved.length > 0 && (
          <>
            <EngravingLabel label="Saved projects" />
            {saved.map((p) => (
              <DiscoveryProjectCard
                key={`saved-${p.id}`}
                project={p}
                ownedCount={p.ownedCount}
                totalCount={p.totalCount}
                matchPct={p.matchPct}
                isSaved={true}
                onBookmark={() => handleBookmark(p)}
                onPress={() => handleOpenProject(p)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

// ── Discovery Project Card ──────────────────────────────────────────────────

function DiscoveryProjectCard({
  project,
  ownedCount,
  totalCount,
  matchPct,
  isSaved,
  onBookmark,
  onPress,
}: {
  project: CuratedProject;
  ownedCount: number;
  totalCount: number;
  matchPct: number;
  isSaved: boolean;
  onBookmark: () => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const catColor = getProjectCategoryColor(project.category);
  const progressColor = matchPct >= 80 ? colors.statusOk : matchPct >= 50 ? colors.accent : colors.statusOut;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        borderRadius: Radius.card,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        padding: Spacing.lg,
        overflow: 'hidden',
      }}
    >
      {/* Top row: title + bookmark */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}
            numberOfLines={1}
          >
            {project.title}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onBookmark}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isSaved ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text
        style={{ fontSize: FontSize.sm, color: colors.textFaint, marginTop: 4, lineHeight: 20 }}
        numberOfLines={2}
      >
        {project.description}
      </Text>

      {/* Badge row: category, difficulty, time, source */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: Spacing.sm }}>
        {/* Category badge */}
        <View style={{
          backgroundColor: catColor + '18',
          borderWidth: 0.5,
          borderColor: catColor + '40',
          borderRadius: Radius.badge,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: catColor }}>
            {project.category.toUpperCase()}
          </Text>
        </View>

        {/* Difficulty badge */}
        <DifficultyBadge difficulty={project.difficulty} />

        {/* Time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>
            {project.estimated_hours < 1
              ? `~${Math.round(project.estimated_hours * 60)}m`
              : `~${project.estimated_hours}h`}
          </Text>
        </View>

        {/* Source badge */}
        {project.source && project.source !== 'community' && (
          <View style={{
            backgroundColor: colors.bgSurface,
            borderRadius: Radius.badge,
            paddingHorizontal: 6,
            paddingVertical: 3,
          }}>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, textTransform: 'capitalize' }}>
              {project.source}
            </Text>
          </View>
        )}
      </View>

      {/* Parts match indicator */}
      <View style={{ marginTop: Spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>
            You have {ownedCount}/{totalCount} parts
          </Text>
          <Text style={{
            fontSize: FontSize.xs, fontWeight: '600',
            color: matchPct >= 80 ? colors.statusOk : matchPct >= 50 ? colors.accent : colors.textMuted,
          }}>
            {matchPct}%
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{
          height: 4,
          backgroundColor: colors.bgDeep,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <View
            style={{
              height: '100%',
              borderRadius: 2,
              width: `${matchPct}%` as unknown as number,
              backgroundColor: progressColor,
            }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Difficulty Badge ────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  const { colors } = useTheme();
  if (!difficulty) return null;
  const config: Record<string, { bg: string; color: string }> = {
    beginner: { bg: colors.statusOkBg, color: colors.statusOk },
    intermediate: { bg: colors.accentBg, color: colors.accent },
    advanced: { bg: colors.statusOutBg, color: colors.statusOut },
  };
  const { bg, color } = config[difficulty] ?? { bg: colors.bgSurface, color: colors.textMuted };
  return (
    <View style={{ backgroundColor: bg, borderRadius: Radius.badge, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color, textTransform: 'capitalize' }}>{difficulty}</Text>
    </View>
  );
}
