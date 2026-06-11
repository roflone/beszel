import { Trans, useLingui } from "@lingui/react/macro"
import { useStore } from "@nanostores/react"
import { getPagePath } from "@nanostores/router"
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	type Table as TableType,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table"
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	EyeIcon,
	FilterIcon,
	LayoutGridIcon,
	LayoutListIcon,
	Settings2Icon,
	XIcon,
} from "lucide-react"
import { type Dispatch, memo, type SetStateAction, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SystemStatus } from "@/lib/enums"
import { $downSystems, $pausedSystems, $systems, $upSystems } from "@/lib/stores"
import { cn, runOnce, useBrowserStorage } from "@/lib/utils"
import type { SystemRecord } from "@/types"
import AlertButton from "../alerts/alert-button"
import { $router, Link } from "../router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import {
	SystemsTableColumns,
	ActionsButton,
	IndicatorDot,
	getSystemCategoryKey,
} from "./systems-table-columns"

type ViewMode = "table" | "grid"
type StatusFilter = "all" | SystemRecord["status"]
type CategoryOrderSetter = Dispatch<SetStateAction<string[]>>

const preloadSystemDetail = runOnce(() => import("@/components/routes/system.tsx"))

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
	const nextItems = [...items]
	const [item] = nextItems.splice(fromIndex, 1)
	if (item !== undefined) {
		nextItems.splice(toIndex, 0, item)
	}
	return nextItems
}

export default function SystemsTable() {
	const data = useStore($systems)
	const downSystems = $downSystems.get()
	const upSystems = $upSystems.get()
	const pausedSystems = $pausedSystems.get()
	const { i18n, t } = useLingui()
	const [filter, setFilter] = useState<string>("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const [sorting, setSorting] = useBrowserStorage<SortingState>(
		"sortMode",
		[{ id: "system", desc: false }],
		sessionStorage
	)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useBrowserStorage<VisibilityState>("cols", {})
	const [categoryOrder, setCategoryOrder] = useBrowserStorage<string[]>("systemCategoryOrder", [])

	const locale = i18n.locale

	// Filter data based on status filter
	const filteredData = useMemo(() => {
		if (statusFilter === "all") {
			return data
		}
		if (statusFilter === SystemStatus.Up) {
			return Object.values(upSystems) ?? []
		}
		if (statusFilter === SystemStatus.Down) {
			return Object.values(downSystems) ?? []
		}
		return Object.values(pausedSystems) ?? []
	}, [data, statusFilter])

	const [viewMode, setViewMode] = useBrowserStorage<ViewMode>(
		"viewMode",
		// show grid view on mobile if there are less than 200 systems (looks better but table is more efficient)
		window.innerWidth < 1024 && filteredData.length < 200 ? "grid" : "table"
	)

	useEffect(() => {
		if (filter !== undefined) {
			table.getColumn("system")?.setFilterValue(filter)
		}
	}, [filter])

	const columnDefs = useMemo(() => SystemsTableColumns(viewMode), [viewMode])

	const table = useReactTable({
		data: filteredData,
		columns: columnDefs,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
		},
		defaultColumn: {
			invertSorting: true,
			sortUndefined: "last",
			minSize: 0,
			size: 900,
			maxSize: 900,
		},
	})

	const rows = table.getRowModel().rows
	const columns = table.getAllColumns()
	const visibleColumns = table.getVisibleLeafColumns()

	const [upSystemsLength, downSystemsLength, pausedSystemsLength] = useMemo(() => {
		return [Object.values(upSystems).length, Object.values(downSystems).length, Object.values(pausedSystems).length]
	}, [upSystems, downSystems, pausedSystems])

	const CardHead = useMemo(() => {
		return (
			<CardHeader className="pb-4.5 px-2 sm:px-6 max-sm:pt-5 max-sm:pb-1">
				<div className="grid md:flex gap-5 w-full items-end">
					<div className="px-2 sm:px-1">
						<CardTitle className="mb-2">
							<Trans>All Systems</Trans>
						</CardTitle>
						<CardDescription className="flex">
							<Trans>Click on a system to view more information.</Trans>
						</CardDescription>
					</div>

					<div className="flex gap-2 ms-auto w-full md:w-80">
						<div className="relative flex-1">
							<Input
								placeholder={t`Filter...`}
								onChange={(e) => setFilter(e.target.value)}
								value={filter}
								className="ps-4 pe-10 w-full"
							/>
							{filter && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={t`Clear`}
									className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
									onClick={() => setFilter("")}
								>
									<XIcon className="h-4 w-4" />
								</Button>
							)}
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline">
									<Settings2Icon className="me-1.5 size-4 opacity-80" />
									<Trans>View</Trans>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="h-72 md:h-auto min-w-48 md:min-w-auto overflow-y-auto">
								<div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-s md:divide-y-0">
									<div className="border-r">
										<DropdownMenuLabel className="pt-2 px-3.5 flex items-center gap-2">
											<LayoutGridIcon className="size-4" />
											<Trans>Layout</Trans>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuRadioGroup
											className="px-1 pb-1"
											value={viewMode}
											onValueChange={(view) => setViewMode(view as ViewMode)}
										>
											<DropdownMenuRadioItem value="table" onSelect={(e) => e.preventDefault()} className="gap-2">
												<LayoutListIcon className="size-4" />
												<Trans>Table</Trans>
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="grid" onSelect={(e) => e.preventDefault()} className="gap-2">
												<LayoutGridIcon className="size-4" />
												<Trans>Grid</Trans>
											</DropdownMenuRadioItem>
										</DropdownMenuRadioGroup>
									</div>

									<div className="border-r">
										<DropdownMenuLabel className="pt-2 px-3.5 flex items-center gap-2">
											<FilterIcon className="size-4" />
											<Trans>Status</Trans>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuRadioGroup
											className="px-1 pb-1"
											value={statusFilter}
											onValueChange={(value) => setStatusFilter(value as StatusFilter)}
										>
											<DropdownMenuRadioItem value="all" onSelect={(e) => e.preventDefault()}>
												<Trans>All Systems</Trans>
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="up" onSelect={(e) => e.preventDefault()}>
												<Trans>Up ({upSystemsLength})</Trans>
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="down" onSelect={(e) => e.preventDefault()}>
												<Trans>Down ({downSystemsLength})</Trans>
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="paused" onSelect={(e) => e.preventDefault()}>
												<Trans>Paused ({pausedSystemsLength})</Trans>
											</DropdownMenuRadioItem>
										</DropdownMenuRadioGroup>
									</div>

									<div className="border-r">
										<DropdownMenuLabel className="pt-2 px-3.5 flex items-center gap-2">
											<ArrowUpDownIcon className="size-4" />
											<Trans>Sort By</Trans>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<div className="px-1 pb-1">
											{columns.map((column) => {
												if (!column.getCanSort()) return null
												let Icon = <span className="w-6"></span>
												// if current sort column, show sort direction
												if (sorting[0]?.id === column.id) {
													if (sorting[0]?.desc) {
														Icon = <ArrowUpIcon className="me-2 size-4" />
													} else {
														Icon = <ArrowDownIcon className="me-2 size-4" />
													}
												}
												return (
													<DropdownMenuItem
														onSelect={(e) => {
															e.preventDefault()
															setSorting([{ id: column.id, desc: sorting[0]?.id === column.id && !sorting[0]?.desc }])
														}}
														key={column.id}
													>
														{Icon}
														{/* @ts-ignore */}
														{column.columnDef.name()}
													</DropdownMenuItem>
												)
											})}
										</div>
									</div>

									<div>
										<DropdownMenuLabel className="pt-2 px-3.5 flex items-center gap-2">
											<EyeIcon className="size-4" />
											<Trans>Visible Fields</Trans>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<div className="px-1.5 pb-1">
											{columns
												.filter((column) => column.getCanHide())
												.map((column) => {
													return (
														<DropdownMenuCheckboxItem
															key={column.id}
															onSelect={(e) => e.preventDefault()}
															checked={column.getIsVisible()}
															onCheckedChange={(value) => column.toggleVisibility(!!value)}
														>
															{/* @ts-ignore */}
															{column.columnDef.name()}
														</DropdownMenuCheckboxItem>
													)
												})}
										</div>
									</div>
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardHeader>
		)
	}, [
		visibleColumns.length,
		sorting,
		viewMode,
		locale,
		statusFilter,
		upSystemsLength,
		downSystemsLength,
		pausedSystemsLength,
		filter,
	])

	return (
		<Card>
			{CardHead}
			<div className="p-6 pt-0 max-sm:py-3 max-sm:px-2">
				{viewMode === "table" ? (
					// table layout
					<div className="rounded-md">
						<AllSystemsTable
							table={table}
							rows={rows}
							colLength={visibleColumns.length}
							categoryOrder={categoryOrder}
							setCategoryOrder={setCategoryOrder}
						/>
					</div>
				) : (
					// grid layout
					<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
						{rows?.length ? (
							rows.map((row) => {
								return <SystemCard key={row.original.id} row={row} table={table} colLength={visibleColumns.length} />
							})
						) : (
							<div className="col-span-full text-center py-8">
								<Trans>No systems found.</Trans>
							</div>
						)}
					</div>
				)}
			</div>
		</Card>
	)
}

const AllSystemsTable = memo(
	({
		table,
		rows,
		colLength,
		categoryOrder,
		setCategoryOrder,
	}: {
		table: TableType<SystemRecord>
		rows: Row<SystemRecord>[]
		colLength: number
		categoryOrder: string[]
		setCategoryOrder: CategoryOrderSetter
	}) => {
		const showActions = table.getColumn("actions")?.getIsVisible() ?? false
		const tableColLength = Math.max(1, showActions ? colLength - 1 : colLength)
		const tableRows = (() => {
			const groups = new Map<string, { label: string; rows: Row<SystemRecord>[] }>()
			for (const row of rows) {
				const categoryKey = getSystemCategoryKey(row.original.name)
				const categoryLabel = categoryKey.toLocaleUpperCase()
				const group = groups.get(categoryKey)
				if (group) {
					group.rows.push(row)
				} else {
					groups.set(categoryKey, { label: categoryLabel, rows: [row] })
				}
			}

			const orderIndex = new Map(categoryOrder.map((categoryKey, index) => [categoryKey, index]))

			const orderedGroups = [...groups.entries()].sort(([keyA, groupA], [keyB, groupB]) => {
					if (!keyA) return -1
					if (!keyB) return 1
					const orderA = orderIndex.get(keyA) ?? Number.POSITIVE_INFINITY
					const orderB = orderIndex.get(keyB) ?? Number.POSITIVE_INFINITY
					if (orderA !== orderB) {
						return orderA - orderB
					}
					return groupA.label.localeCompare(groupB.label)
				})

			const movableGroups = orderedGroups.filter(([key]) => key)
			const movableGroupIndex = new Map(movableGroups.map(([key], index) => [key, index]))

			return orderedGroups.flatMap(([key, group]) => {
					const systemRows = group.rows.map((row) => ({ type: "system" as const, key: row.id, row }))
					if (!group.label) {
						return systemRows
					}
					const groupIndex = movableGroupIndex.get(key) ?? 0
					return [
						{
							type: "category" as const,
							key: `category-${key}`,
							categoryKey: key,
							category: group.label,
							count: group.rows.length,
							canMoveUp: groupIndex > 0,
							canMoveDown: groupIndex < movableGroups.length - 1,
						},
						...systemRows,
					]
				})
		})()

		function moveCategory(categoryKey: string, direction: -1 | 1) {
			const groupKeys = tableRows
				.filter((tableRow) => tableRow.type === "category")
				.map((tableRow) => tableRow.categoryKey)
			setCategoryOrder((currentOrder) => {
				const orderedKeys = [
					...currentOrder.filter((key) => groupKeys.includes(key)),
					...groupKeys.filter((key) => !currentOrder.includes(key)),
				]
				const currentIndex = orderedKeys.indexOf(categoryKey)
				const nextIndex = currentIndex + direction
				if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedKeys.length) {
					return orderedKeys
				}
				return moveItem(orderedKeys, currentIndex, nextIndex)
			})
		}

		return (
			<Table className="w-full text-sm">
				<SystemsTableHead table={table} />
				<TableBody onMouseEnter={preloadSystemDetail}>
					{rows.length ? (
						tableRows.map((tableRow) =>
							tableRow.type === "category" ? (
								<SystemCategoryRow
									key={tableRow.key}
									categoryKey={tableRow.categoryKey}
									category={tableRow.category}
									count={tableRow.count}
									colLength={tableColLength}
									canMoveUp={tableRow.canMoveUp}
									canMoveDown={tableRow.canMoveDown}
									onMove={moveCategory}
								/>
							) : (
								<SystemTableRow key={tableRow.key} row={tableRow.row} length={rows.length} colLength={colLength} />
							)
						)
					) : (
						<TableRow>
							<TableCell colSpan={tableColLength} className="h-24 text-center pointer-events-none">
								<Trans>No systems found.</Trans>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		)
	}
)

function SystemCategoryRow({
	categoryKey,
	category,
	count,
	colLength,
	canMoveUp,
	canMoveDown,
	onMove,
}: {
	categoryKey: string
	category: string
	count: number
	colLength: number
	canMoveUp: boolean
	canMoveDown: boolean
	onMove: (categoryKey: string, direction: -1 | 1) => void
}) {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell colSpan={colLength} className="h-7 py-1 px-2 border-b bg-muted/25">
				<div className="flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
					<div className="flex items-center gap-0.5">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-5 text-muted-foreground"
							disabled={!canMoveUp}
							onClick={() => onMove(categoryKey, -1)}
						>
							<ArrowUpIcon className="size-3" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-5 text-muted-foreground"
							disabled={!canMoveDown}
							onClick={() => onMove(categoryKey, 1)}
						>
							<ArrowDownIcon className="size-3" />
						</Button>
					</div>
					<span>{category}</span>
					<span className="rounded-full bg-background/80 px-1.5 py-0 text-[0.65rem] leading-4 tabular-nums">{count}</span>
				</div>
			</TableCell>
		</TableRow>
	)
}

function SystemsTableHead({ table }: { table: TableType<SystemRecord> }) {
	const showActions = table.getColumn("actions")?.getIsVisible() ?? false
	return (
		<TableHeader className="sticky top-0 z-50 w-full border-b-2">
			{table.getHeaderGroups().map((headerGroup) => {
				const headers = headerGroup.headers.filter((header) => header.column.id !== "actions")
				return (
					<tr key={headerGroup.id}>
						{headers.map((header, index) => {
							const isLast = index === headers.length - 1
							return (
								<TableHead className={cn("px-1.5", showActions && isLast && "pe-20")} key={header.id}>
									{flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							)
						})}
					</tr>
				)
			})}
		</TableHeader>
	)
}

const SystemTableRow = memo(
	({ row, length, colLength }: { row: Row<SystemRecord>; length: number; colLength: number }) => {
		const system = row.original
		const { t } = useLingui()
		return useMemo(() => {
			const cells = row.getVisibleCells().filter((cell) => cell.column.id !== "actions")
			const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === "actions")
			return (
				<TableRow
					className={cn("group cursor-pointer transition-opacity relative safari:transform-3d", {
						"opacity-50": system.status === SystemStatus.Paused,
					})}
				>
					{cells.map((cell, index) => {
						const isLast = index === cells.length - 1
						return (
							<TableCell
								key={cell.id}
								style={{
									width: cell.column.getSize(),
								}}
								className={cn(
									"overflow-hidden relative",
									length > 10 ? "py-2" : "py-2.5",
									actionsCell && isLast && "pe-20"
								)}
							>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
								{actionsCell && isLast && (
									<div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-background/85 px-0.5 shadow-sm backdrop-blur-sm">
										{flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
									</div>
								)}
							</TableCell>
						)
					})}
				</TableRow>
			)
		}, [system, system.status, colLength, t, length, row])
	}
)

const SystemCard = memo(
	({ row, table, colLength }: { row: Row<SystemRecord>; table: TableType<SystemRecord>; colLength: number }) => {
		const system = row.original
		const { t } = useLingui()

		return useMemo(() => {
			return (
				<Card
					onMouseEnter={preloadSystemDetail}
					key={system.id}
					className={cn(
						"cursor-pointer hover:shadow-md transition-all bg-transparent w-full dark:border-border duration-200 relative",
						{
							"opacity-50": system.status === SystemStatus.Paused,
						}
					)}
				>
					<CardHeader className="py-1 ps-5 pe-3 bg-muted/30 border-b border-border/60">
						<div className="flex items-center gap-2 w-full overflow-hidden">
							<CardTitle className="text-base tracking-normal text-primary/90 flex items-center min-w-0 flex-1 gap-2.5">
								<div className="flex items-center gap-2.5 min-w-0 flex-1">
									<IndicatorDot system={system} />
									<span className="text-[.95em]/normal tracking-normal text-primary/90 truncate">{system.name}</span>
								</div>
							</CardTitle>
							{table.getColumn("actions")?.getIsVisible() && (
								<div className="flex gap-1 shrink-0 relative z-10">
									<AlertButton system={system} />
									<ActionsButton system={system} />
								</div>
							)}
						</div>
					</CardHeader>
					<CardContent className="text-sm px-5 pt-3.5 pb-4">
						<div className="grid gap-2.5" style={{ gridTemplateColumns: "24px minmax(80px, max-content) 1fr" }}>
							{table.getAllColumns().map((column) => {
								if (!column.getIsVisible() || column.id === "system" || column.id === "actions") return null
								const cell = row.getAllCells().find((cell) => cell.column.id === column.id)
								if (!cell) return null
								// @ts-expect-error
								const { Icon, name } = column.columnDef as ColumnDef<SystemRecord, unknown>
								return (
									<>
										<div key={`${column.id}-icon`} className="flex items-center">
											{column.id === "lastSeen" ? (
												<EyeIcon className="size-4 text-muted-foreground" />
											) : (
												Icon && <Icon className="size-4 text-muted-foreground" />
											)}
										</div>
										<div key={`${column.id}-label`} className="flex items-center text-muted-foreground pr-3">
											{name()}:
										</div>
										<div key={`${column.id}-value`} className="flex items-center">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</div>
									</>
								)
							})}
						</div>
					</CardContent>
					<Link
						href={getPagePath($router, "system", { id: row.original.id })}
						className="inset-0 absolute w-full h-full"
					>
						<span className="sr-only">{row.original.name}</span>
					</Link>
				</Card>
			)
		}, [system, colLength, t])
	}
)
