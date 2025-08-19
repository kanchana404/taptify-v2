"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2, 
  ChevronDown,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserBaseItem {
  id: number;
  aaname: string;
  phone: string;
  status: string;
}

export default function UserBase() {
  const [userBaseData, setUserBaseData] = useState<UserBaseItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserBaseItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    fetchUserBase();
  }, []);

  const fetchUserBase = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/userbase");
      
      if (!res.ok) {
        throw new Error("Failed to fetch user base");
      }
      
      const data = await res.json();
      setUserBaseData(data);
    } catch (err) {
      console.error("Error fetching user base:", err);
      setError(err instanceof Error ? err.message : "Failed to load user base");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: UserBaseItem) => {
    setSelectedUser(user);
    setEditedName(user.aaname);
    setEditedPhone(user.phone);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setSelectedUser(null);
    setEditedName("");
    setEditedPhone("");
    setIsEditOpen(false);
  };

  const openDeleteModal = (user: UserBaseItem) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedUser(null);
    setIsDeleteOpen(false);
  };

  const updateUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`/api/userbase/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editedName, phone: editedPhone }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update user");
      }
      
      closeEditModal();
      fetchUserBase();
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`/api/userbase/${selectedUser.id}`, { 
        method: "DELETE" 
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      
      closeDeleteModal();
      fetchUserBase();
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  // Define columns
  const columns = useMemo<ColumnDef<UserBaseItem>[]>(
    () => [
      {
        accessorKey: "aaname",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="pl-0 text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("aaname")}</div>,
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="pl-0 text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
          >
            Phone
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue("phone")}</div>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <div
            className="flex cursor-pointer items-center text-purple-700 dark:text-purple-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <div className="flex items-center gap-2">
              {status === "Active" ? (
                <CheckCircle2 className="text-purple-600 dark:text-purple-400 h-4 w-4" />
              ) : status === "Inactive" ? (
                <XCircle className="text-destructive h-4 w-4" />
              ) : (
                <XCircle className="text-muted-foreground h-4 w-4 opacity-40" />
              )}
              <span>{status}</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                onClick={() => openEditModal(user)}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => openDeleteModal(user)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: userBaseData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (loading) {
    return (
      <div className="space-y-3 py-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 my-3">
        <div className="text-sm text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (userBaseData.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg border">
        <XCircle className="h-10 w-10 text-purple-400 mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground text-sm">No users found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter names..."
          value={(table.getColumn("aaname")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("aaname")?.setFilterValue(event.target.value)
          }
          className="max-w-sm border-purple-200 focus-visible:ring-purple-500 dark:border-purple-800"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto border-purple-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border border-purple-200 dark:border-purple-900/30">
        <Table>
          <TableHeader className="bg-purple-50 dark:bg-purple-900/20">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-purple-200 dark:border-purple-800 hover:bg-purple-100/50 dark:hover:bg-purple-800/20">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-purple-700 dark:text-purple-400">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-purple-200 dark:border-purple-800 hover:bg-purple-50/50 dark:hover:bg-purple-900/10">
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
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {userBaseData.length} users total
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-purple-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 disabled:text-muted-foreground"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-purple-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 disabled:text-muted-foreground"
          >
            Next
          </Button>
        </div>
      </div>
    
      {/* Edit User Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle className="text-purple-800 dark:text-purple-300">Edit User</DialogTitle>
            <DialogDescription>
              Update the user's name and phone number.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input 
                id="name" 
                value={editedName} 
                onChange={(e) => setEditedName(e.target.value)} 
                className="col-span-3 border-purple-200 focus-visible:ring-purple-500 dark:border-purple-800" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input 
                id="phone" 
                value={editedPhone} 
                onChange={(e) => setEditedPhone(e.target.value)} 
                className="col-span-3 border-purple-200 focus-visible:ring-purple-500 dark:border-purple-800" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal} className="border-purple-200 dark:border-purple-800">
              Cancel
            </Button>
            <Button onClick={updateUser} className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle className="text-purple-800 dark:text-purple-300">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteModal} className="border-purple-200 dark:border-purple-800">
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}