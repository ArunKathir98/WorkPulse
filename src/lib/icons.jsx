import {
  ListTodo, Circle, CircleDot, Clock, CircleCheck, Flame, Star, Flag, Calendar, CalendarDays,
  Bookmark, Lightbulb, Pause, Rocket, Target, Archive, Inbox, Bell, Heart, Zap, Coffee,
  Briefcase, House, ShoppingCart, BookOpen, Code, Bug, Hash, Type, Pin, Hourglass, Sparkles,
  Ban, Eye, Lock, Music, Plane, Dumbbell, Wrench, MessageSquare, Layers
} from 'lucide-react'

export const ICONS = {
  ListTodo, Circle, CircleDot, Clock, CircleCheck, Flame, Star, Flag, Calendar, CalendarDays,
  Bookmark, Lightbulb, Pause, Rocket, Target, Archive, Inbox, Bell, Heart, Zap, Coffee,
  Briefcase, House, ShoppingCart, BookOpen, Code, Bug, Hash, Type, Pin, Hourglass, Sparkles,
  Ban, Eye, Lock, Music, Plane, Dumbbell, Wrench, MessageSquare, Layers
}
export const ICON_NAMES = Object.keys(ICONS)

export function Icon({ name, ...props }) {
  const C = ICONS[name] || Circle
  return <C aria-hidden="true" {...props} />
}
