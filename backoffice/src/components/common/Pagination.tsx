'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    perPage: number
    onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, totalItems, perPage, onPageChange }: PaginationProps) {
    const startItem = (currentPage - 1) * perPage + 1
    const endItem = Math.min(currentPage * perPage, totalItems)
    const canGoPrevious = currentPage > 1
    const canGoNext = currentPage < totalPages

    function getPageNumbers(): number[] {
        const delta = 2
        const range: number[] = []
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i)
        }
        const result: number[] = []
        if (currentPage - delta > 2) { result.push(1) } else { result.push(1) }
        result.push(...range)
        if (totalPages > 1 && !result.includes(totalPages)) result.push(totalPages)
        return result.filter((p, i) => result.indexOf(p) === i && p > 0)
    }

    if (totalPages <= 1) return null

    return (
        <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{startItem}</span> a{' '}
                <span className="font-medium">{endItem}</span> de{' '}
                <span className="font-medium">{totalItems}</span>
            </div>
            <div className="flex items-center space-x-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={!canGoPrevious}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={!canGoPrevious}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers().map((pageNum) => (
                    <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange(pageNum)}
                        className="h-8 w-8 p-0"
                    >
                        {pageNum}
                    </Button>
                ))}
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={!canGoNext}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={!canGoNext}>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
