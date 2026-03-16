"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

export interface DataTablePaginationProps {
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const handleGoToPage = (value: string) => {
    if (!value) return;
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const clamped = Math.min(Math.max(1, Math.floor(num)), totalPages);
    if (clamped !== page) {
      onPageChange(clamped);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Rows per page
        </p>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            onPageSizeChange(Number(v));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="w-[72px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {totalCount === 0 ? "0 of 0" : `${start}–${end} of ${totalCount}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground hidden sm:inline min-w-[80px] text-center">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground hidden sm:inline">Go to</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            className="w-16 h-9 text-sm"
            defaultValue={page}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleGoToPage((e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              handleGoToPage(e.target.value);
            }}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
