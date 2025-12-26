import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({ value, onChange, options, placeholder, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on query
  const filteredOptions = query === ''
    ? options
    : options.filter((opt) =>
        opt.toLowerCase().includes(query.toLowerCase())
      );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when value changes from outside (e.g. init)
  useEffect(() => {
    // Only update query if the menu is closed to avoid messing with user typing
    if (!isOpen) { 
       setQuery(value);
    }
  }, [value, isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setQuery(option);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        type="text"
        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={isOpen ? query : value} // Show value when closed, query when typing
        onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
        }}
        onFocus={() => {
            setQuery(''); // Clear query on focus to show all options, or keep it? 
            // Better UX usually: select all text or clear. Let's try clearing to allow fresh search or pre-fill.
            // Actually, if I want to "filter", I should probably keep the current text but select it.
            // Let's just set open. The value prop handles what is shown.
            // If I type, query updates.
            setQuery(value);
            setIsOpen(true);
        }}
        onBlur={() => {
            // Delay closing to allow clicking an option
            // Handled by click outside, but nice to handle tab out.
            // We'll rely on click outside for mouse users.
            // For keyboard users (Tab), we might need logic.
        }}
      />
      
      {/* Arrow icon */}
      <div 
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
        onClick={() => {
            if (isOpen) {
                setIsOpen(false);
            } else {
                setQuery(value); // Reset query to current value
                setIsOpen(true);
            }
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-gray-500 text-sm">No models found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option}
                className={`p-2 cursor-pointer text-sm hover:bg-blue-50 ${
                  option === value ? 'bg-blue-100 font-medium' : ''
                }`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
