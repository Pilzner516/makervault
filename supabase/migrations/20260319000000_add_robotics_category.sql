-- MakerVault — Add Robotics Category
-- File: supabase/migrations/20260319000000_add_robotics_category.sql
-- Run via: supabase db push
-- Or paste into Supabase dashboard SQL Editor

-- ─── INSERT ROBOTICS CATEGORY ───────────────────────────────────────────────

-- Shift Safety & PPE down to make room (sort_order 7 → 8)
update categories set sort_order = 8 where name = 'Safety & PPE';

-- Insert Robotics at sort_order 2 (after Electronics)
-- Shift existing categories 2-7 up by one
update categories set sort_order = sort_order + 1
  where sort_order >= 2 and name != 'Safety & PPE';

insert into categories (name, icon, colour, sort_order, is_default) values
  ('Robotics', 'hardware-chip-outline', '#e879f9', 2, true);

-- ─── INSERT ROBOTICS SUBCATEGORIES ──────────────────────────────────────────

insert into subcategories (category_id, name, sort_order)
select id, sub.name, sub.ord from categories, (values
  ('Robot Kits',          1),
  ('Servo Motors',        2),
  ('Stepper Motors',      3),
  ('DC Motors',           4),
  ('Motor Drivers',       5),
  ('Motor Controllers',   6),
  ('ESCs',                7),
  ('Wheels & Tires',      8),
  ('Chassis & Frames',    9),
  ('Robotic Arms',        10),
  ('Grippers',            11),
  ('Actuators',           12),
  ('Lidar',               13),
  ('Ultrasonic Sensors',  14),
  ('IR Sensors',          15),
  ('Line Followers',      16),
  ('Robot Platforms',     17),
  ('Drone Parts',         18),
  ('Propellers',          19),
  ('Flight Controllers',  20),
  ('Gimbals',             21),
  ('FPV Cameras',         22),
  ('RC Receivers',        23),
  ('RC Transmitters',     24)
) as sub(name, ord)
where categories.name = 'Robotics';
