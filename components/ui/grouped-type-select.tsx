"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssemblyType {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

interface GroupedTypeSelectProps {
  value: string | null;
  onChange: (typeId: string | null, categoryId: string | null) => void;
  types: AssemblyType[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function GroupedTypeSelect({
  value,
  onChange,
  types,
  placeholder = "Select assembly type...",
  disabled = false,
  className,
}: GroupedTypeSelectProps) {
  // Group types by category
  const groupedTypes = React.useMemo(() => {
    const groups: Record<string, { category: { id: string; name: string }; types: AssemblyType[] }> = {};
    
    types.forEach((type) => {
      const categoryId = type.category.id;
      if (!groups[categoryId]) {
        groups[categoryId] = {
          category: type.category,
          types: [],
        };
      }
      groups[categoryId].types.push(type);
    });
    
    // Sort groups by category name and types by name within each group
    return Object.values(groups)
      .sort((a, b) => a.category.name.localeCompare(b.category.name))
      .map((group) => ({
        ...group,
        types: group.types.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [types]);

  // Find the selected type for display
  const selectedType = React.useMemo(() => {
    if (!value) return null;
    return types.find((t) => t.id === value) || null;
  }, [value, types]);

  const handleValueChange = (newValue: string) => {
    if (newValue === "__none__") {
      onChange(null, null);
      return;
    }
    
    const selectedType = types.find((t) => t.id === newValue);
    if (selectedType) {
      onChange(selectedType.id, selectedType.categoryId);
    }
  };

  return (
    <Select
      value={value || "__none__"}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {selectedType ? (
            <span className="flex items-center gap-2">
              <span>{selectedType.name}</span>
              <span className="text-xs text-muted-foreground">
                ({selectedType.category.name})
              </span>
            </span>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* None option */}
        <SelectItem value="__none__" className="text-muted-foreground">
          No type
        </SelectItem>
        
        {/* Grouped types */}
        {groupedTypes.map((group) => (
          <SelectGroup key={group.category.id}>
            <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50 -mx-1 px-3 py-2 font-medium">
              {group.category.name}
            </SelectLabel>
            {group.types.map((type) => (
              <SelectItem
                key={type.id}
                value={type.id}
                className="pl-4"
              >
                <div className="flex flex-col">
                  <span>{type.name}</span>
                  {type.description && (
                    <span className="text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
