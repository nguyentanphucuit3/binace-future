"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { RSI_FILTERS } from "@/constants/scan";

interface RSIFilterPanelProps {
  selectedRSI: string | null;
  expandedCategory: string | null;
  isPending: boolean;
  onCategoryToggle: (category: string | null) => void;
  onFilterClick: (filterKey: string) => void;
}

export function RSIFilterPanel({
  selectedRSI,
  expandedCategory,
  isPending,
  onCategoryToggle,
  onFilterClick,
}: RSIFilterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bộ lọc RSI</CardTitle>
        <CardDescription>
          Chọn ngưỡng RSI để lọc kết quả, sau đó nhấn &quot;Quét RSI&quot;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Main category buttons */}
          <div className="flex gap-2">
            {Object.entries(RSI_FILTERS).map(([key, config]) => {
              const isExpanded = expandedCategory === config.category;
              return (
                <Button
                  key={key}
                  variant={isExpanded ? "default" : "outline"}
                  onClick={() => onCategoryToggle(isExpanded ? null : config.category)}
                  disabled={isPending}
                  className={`flex-1 justify-between ${config.className} ${config.textClassName(isExpanded)}`}
                >
                  <span className="font-medium">{config.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Sub-filter buttons */}
          {expandedCategory && (() => {
            const config = Object.values(RSI_FILTERS).find(c => c.category === expandedCategory);
            if (!config) return null;
            
            return (
              <div className="flex flex-wrap gap-2">
                {config.buttons.map((btn) => {
                  const isSelected = selectedRSI === btn.key;
                  
                  // Build className based on selection state
                  let buttonClassName = "";
                  if (isSelected) {
                    // When selected, use primary colors with high contrast text
                    if (expandedCategory === "lt30") {
                      buttonClassName = "bg-green-600 dark:bg-green-600 text-white dark:text-white font-semibold border-green-600 dark:border-green-600 hover:bg-green-700 dark:hover:bg-green-700";
                    } else if (expandedCategory === "gte70") {
                      buttonClassName = "bg-red-600 dark:bg-red-600 text-white dark:text-white font-semibold border-red-600 dark:border-red-600 hover:bg-red-700 dark:hover:bg-red-700";
                    } else if (expandedCategory === "30-70") {
                      buttonClassName = "bg-gray-700 dark:bg-gray-600 text-white dark:text-white font-semibold border-gray-700 dark:border-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700";
                    }
                  } else {
                    // When not selected, use the original styling
                    if (expandedCategory === "lt30" || expandedCategory === "gte70") {
                      buttonClassName = config.className;
                      if (expandedCategory === "lt30") {
                        buttonClassName += " text-green-800 dark:text-green-200";
                      } else {
                        buttonClassName += " text-red-800 dark:text-red-200";
                      }
                    } else if (expandedCategory === "30-70") {
                      // Default styling for 30-70 buttons when not selected
                      buttonClassName = "text-gray-700 dark:text-gray-300";
                    }
                  }
                  
                  return (
                    <Button
                      key={btn.key}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => onFilterClick(btn.key)}
                      disabled={isPending}
                      className={buttonClassName}
                    >
                      {btn.label}
                    </Button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

