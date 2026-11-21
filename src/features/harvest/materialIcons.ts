import { Gem, Leaf, Mountain, TreePine, type LucideIcon } from 'lucide-react'
import type { Material } from '../../game/map'

export const MATERIAL_ICON: Record<Material, LucideIcon> = { wood: TreePine, stone: Mountain, herbs: Leaf, crystal: Gem }
