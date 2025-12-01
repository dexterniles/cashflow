"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown, ShoppingBag, Home, Car, Utensils, Zap, Smartphone, HeartPulse, Briefcase, GraduationCap, Plane, Music, Gift, HelpCircle } from 'lucide-react'
import { format } from "date-fns";

import { TransactionDialog } from "@/components/transaction-dialog";

type Transaction = {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  type: "income" | "expense";
  status: "cleared" | "pending" | "estimated";
};

interface TransactionTableProps {
  type?: "income" | "expense";
  status?: "cleared" | "pending" | "estimated";
  excludeStatus?: "cleared" | "pending" | "estimated"; // To exclude cleared for "Bills"
}

const getCategoryIcon = (category: string) => {
  const c = category.toLowerCase()
  if (c.includes('food') || c.includes('grocer') || c.includes('restaurant')) return <Utensils className="h-4 w-4 mr-2 text-orange-500" />
  if (c.includes('rent') || c.includes('mortgage') || c.includes('home')) return <Home className="h-4 w-4 mr-2 text-blue-500" />
  if (c.includes('car') || c.includes('gas') || c.includes('transport')) return <Car className="h-4 w-4 mr-2 text-slate-500" />
  if (c.includes('shop') || c.includes('cloth')) return <ShoppingBag className="h-4 w-4 mr-2 text-pink-500" />
  if (c.includes('util') || c.includes('electric') || c.includes('water')) return <Zap className="h-4 w-4 mr-2 text-yellow-500" />
  if (c.includes('phone') || c.includes('internet')) return <Smartphone className="h-4 w-4 mr-2 text-purple-500" />
  if (c.includes('health') || c.includes('doctor')) return <HeartPulse className="h-4 w-4 mr-2 text-red-500" />
  if (c.includes('work') || c.includes('salary') || c.includes('income')) return <Briefcase className="h-4 w-4 mr-2 text-green-500" />
  if (c.includes('school') || c.includes('edu')) return <GraduationCap className="h-4 w-4 mr-2 text-indigo-500" />
  if (c.includes('travel') || c.includes('hotel')) return <Plane className="h-4 w-4 mr-2 text-sky-500" />
  if (c.includes('entertain') || c.includes('music')) return <Music className="h-4 w-4 mr-2 text-violet-500" />
  if (c.includes('gift') || c.includes('donation')) return <Gift className="h-4 w-4 mr-2 text-rose-500" />
  return <HelpCircle className="h-4 w-4 mr-2 text-gray-400" />
}

export function TransactionTable({
  type,
  status,
  excludeStatus,
}: TransactionTableProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const { data: transactions } = useQuery({
    queryKey: ["transactions", type, status, excludeStatus],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (excludeStatus) {
        query = query.neq("status", excludeStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Transaction[];
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => format(new Date(row.getValue("date")), "MMM dd, yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <div className="flex items-center">
            {getCategoryIcon(row.getValue('category'))}
            {row.getValue('category')}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        const type = row.original.type;
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);

        return (
          <div
            className={type === "income" ? "text-green-600" : "text-red-600"}
          >
            {formatted}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("status")}</div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(transaction.id)}
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setEditingTransaction(transaction)}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteTransaction.mutate(transaction.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: transactions || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <>
      <TransactionDialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end space-x-2 py-4 px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
