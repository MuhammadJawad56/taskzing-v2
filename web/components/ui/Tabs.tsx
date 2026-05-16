"use client";

import React, { Dispatch, SetStateAction } from "react";

interface Tab {
  id: string;
  label: string;
  count: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: Dispatch<SetStateAction<string>>;
}

export const Tabs = ({ tabs, activeTab, onTabChange }: TabsProps) => {
  return (
    <div className="border-b border-theme-accent2">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  isActive
                    ? "border-theme-red text-theme-primaryText"
                    : "border-transparent text-theme-accent4 hover:text-theme-primaryText hover:border-theme-accent2"
                }
              `}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`
                    ml-2 py-0.5 px-2 rounded-full text-xs font-semibold
                    ${
                      isActive
                        ? "bg-theme-red/10 text-theme-red"
                        : "bg-theme-accent2 text-theme-accent4"
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

