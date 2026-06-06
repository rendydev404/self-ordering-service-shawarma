'use client'

import type { Category } from '@/types'

interface Props {
  categories: Category[]
  selected: string
  onChange: (id: string) => void
}

export default function CategoryFilter({ categories, selected, onChange }: Props) {
  const tabs = [{ id: 'all', name: 'Semua Menu' }, ...categories]

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {tabs.map((tab) => {
        const isActive = selected === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-semibold
              transition-all duration-200 outline-none
              ${isActive
                ? 'bg-amber-gradient text-white shadow-amber scale-[1.02]'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-amber-300 hover:text-amber-700'
              }`}
          >
            {tab.name}
          </button>
        )
      })}
    </div>
  )
}
