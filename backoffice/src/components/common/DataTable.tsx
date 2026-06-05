'use client'

import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from './Pagination'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import type { Pagination as PaginationType } from '@/types'

export interface Column<T> {
    key: string
    label: string
    sortable?: boolean
    className?: string
    render?: (value: unknown, row: T) => React.ReactNode
}

export interface FilterOption {
    key: string
    label: string
    options: { value: string; label: string }[]
}

interface DataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    pagination?: PaginationType
    onPageChange?: (page: number) => void
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    filters?: FilterOption[]
    filterValues?: Record<string, string>
    onFilterChange?: (key: string, value: string) => void
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    onSortChange?: (field: string) => void
    isLoading?: boolean
    emptyMessage?: string
    actions?: (row: T) => React.ReactNode
    onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    pagination,
    onPageChange,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Buscar...',
    filters = [],
    filterValues = {},
    onFilterChange,
    sortField,
    sortOrder,
    onSortChange,
    isLoading = false,
    emptyMessage = 'No se encontraron registros',
    actions,
    onRowClick,
}: DataTableProps<T>) {
    const [localSort, setLocalSort] = useState<{ field: string; order: 'asc' | 'desc' } | null>(null)

    const currentSortField = sortField || localSort?.field
    const currentSortOrder = sortOrder || localSort?.order

    const handleSort = (field: string) => {
        if (onSortChange) {
            onSortChange(field)
        } else {
            setLocalSort(prev => {
                if (prev?.field === field) {
                    return prev.order === 'asc' ? { field, order: 'desc' } : null
                }
                return { field, order: 'asc' }
            })
        }
    }

    const sortedData = React.useMemo(() => {
        if (onSortChange || !localSort) return data
        return [...data].sort((a, b) => {
            const aVal = getNestedValue(a, localSort.field)
            const bVal = getNestedValue(b, localSort.field)
            if (aVal == null && bVal == null) return 0
            if (aVal == null) return 1
            if (bVal == null) return -1
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return localSort.order === 'asc' ? aVal - bVal : bVal - aVal
            }
            const strA = String(aVal).toLowerCase()
            const strB = String(bVal).toLowerCase()
            return localSort.order === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
        })
    }, [data, localSort, onSortChange])

    const renderSortIcon = (field: string) => {
        if (currentSortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
        return currentSortOrder === 'asc'
            ? <ArrowUp className="h-3 w-3 ml-1 text-primary-600" />
            : <ArrowDown className="h-3 w-3 ml-1 text-primary-600" />
    }

    const getCellValue = (row: T, col: Column<T>) => {
        const value = getNestedValue(row, col.key)
        if (col.render) return col.render(value, row)
        if (value == null) return <span className="text-gray-400">-</span>
        return String(value)
    }

    return (
        <div className="space-y-4">
            {(onSearchChange || filters.length > 0) && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {onSearchChange && (
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={searchValue || ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    )}
                    {filters.map((filter) => (
                        <Select
                            key={filter.key}
                            value={filterValues[filter.key] || ''}
                            onValueChange={(v) => onFilterChange?.(filter.key, v === '__all__' ? '' : v)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={filter.label} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todos</SelectItem>
                                {filter.options.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ))}
                </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200">
                            {columns.map((col) => (
                                <TableHead key={col.key} className={col.className}>
                                    {col.sortable ? (
                                        <button
                                            className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                                            onClick={() => handleSort(col.key)}
                                        >
                                            {col.label}
                                            {renderSortIcon(col.key)}
                                        </button>
                                    ) : (
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{col.label}</span>
                                    )}
                                </TableHead>
                            ))}
                            {actions && <TableHead className="w-[100px]"><span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</span></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12">
                                    <div className="flex items-center justify-center gap-2 text-gray-500">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Cargando...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : sortedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-gray-500">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedData.map((row, idx) => (
                                <TableRow
                                    key={(row as Record<string, unknown>).id as string || idx}
                                    className={onRowClick ? 'cursor-pointer' : ''}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((col) => (
                                        <TableCell key={col.key} className={col.className}>
                                            {getCellValue(row, col)}
                                        </TableCell>
                                    ))}
                                    {actions && (
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            {actions(row)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && onPageChange && pagination.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    perPage={pagination.perPage}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    )
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
        return undefined
    }, obj)
}
