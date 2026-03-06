import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputWithDebounceProps {
  placeholder?: string;
  initialValue?: string;
  onDebouncedChange: (value: string) => void;
  debounceTime?: number;
  className?: string;
  inputClassName?: string;
}

const SearchInputWithDebounce = React.memo(
  ({
    placeholder = 'Buscar...',
    initialValue = '',
    onDebouncedChange,
    debounceTime = 300,
    className,
    inputClassName,
  }: SearchInputWithDebounceProps) => {
    const [inputValue, setInputValue] = useState(initialValue);

    useEffect(() => {
      const handler = setTimeout(() => {
        onDebouncedChange(inputValue);
      }, debounceTime);

      return () => {
        clearTimeout(handler);
      };
    }, [inputValue, debounceTime, onDebouncedChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    }, []);

    return (
      <div className={cn("relative flex-1 w-full", className)}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          className={cn(
            "pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#9E7FFF]/20 text-gray-700 font-medium",
            inputClassName
          )}
        />
      </div>
    );
  }
);

export default SearchInputWithDebounce;
