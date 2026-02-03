/**
 * Canonical UI Component Library
 *
 * Single source of truth for all UI components.
 * Re-exports from focused, dedicated component modules.
 */

// Core components from dedicated modules
export { Button, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Select, type SelectProps, type SelectOption } from './select';
export { Modal, type ModalProps } from './modal';
export { WideModal, type WideModalProps } from './wide-modal';
export { Switch, Slider, type SwitchProps, type SliderProps } from './form-controls';
export { Checkbox, type CheckboxProps } from './Checkbox';

// Individual component files
export { Alert, AlertDescription, type AlertProps } from './alert';
export { Badge, type BadgeProps } from './badge';
export { Card } from './Card';
export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsProps
} from './tabs';

// Design System Components
export { Section } from './Section';
export { StatusBadge, type BadgeVariant, type BadgeSize } from './StatusBadge';
export { TabGroup, type Tab } from './TabGroup';
export { Metric } from './Metric';
export { ListItem } from './ListItem';

// Specific components
export { HamburgerButton } from './HamburgerButton';
export { ProgressBar, ProgressBarWithLabels, type ProgressBarProps, type ProgressBarWithLabelsProps } from './ProgressBar';
