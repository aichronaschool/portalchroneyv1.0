import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Lead } from "@shared/schema";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, Contact, Mail, Phone, MessageSquare, Calendar, User, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useLocation } from "wouter";

export default function AdminLeads() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
      toast({
        title: "Lead deleted",
        description: "Lead has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    setLeadToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete);
    }
  };

  const handleViewConversation = (conversationId: string) => {
    setLocation(`/conversations?id=${conversationId}`);
  };

  const handleExport = () => {
    if (leads.length === 0) {
      toast({
        title: "No leads to export",
        description: "There are no leads available to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for Excel export
    const worksheetData = leads.map((lead: Lead) => ({
      Name: lead.name,
      Email: lead.email,
      Phone: lead.phone || "",
      Message: lead.message || "",
      "Created At": format(new Date(lead.createdAt), "yyyy-MM-dd HH:mm:ss")
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 40 }, // Message
      { wch: 20 }, // Created At
    ];

    // Generate Excel file and trigger download
    const filename = `leads-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, filename);

    toast({
      title: "Export successful",
      description: `Exported ${leads.length} leads to Excel file.`,
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Contact className="w-6 h-6 text-purple-600" />
                Leads Management
              </CardTitle>
              <CardDescription>View and export captured leads from conversations</CardDescription>
            </div>
            <Button onClick={handleExport} disabled={leads.length === 0} data-testid="button-export-leads" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading leads...</p>
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4">
                <Contact className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Leads will appear here when users provide their contact information through the AI chat.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-50 hover:to-blue-50">
                    <TableHead className="font-semibold text-gray-900 w-[160px]">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-600" />
                        Name
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 w-[220px]">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        Email
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 w-[140px]">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        Phone
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                        Message
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 w-[140px]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        Created At
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold text-gray-900 w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead: Lead, index: number) => {
                    const getInitials = (name: string | null) => {
                      if (!name) return "?";
                      return name
                        .split(" ")
                        .map(n => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                    };

                    const getAvatarColor = (name: string | null) => {
                      if (!name) return "bg-gray-500";
                      const colors = [
                        "bg-gradient-to-br from-purple-500 to-purple-600",
                        "bg-gradient-to-br from-blue-500 to-blue-600",
                        "bg-gradient-to-br from-green-500 to-green-600",
                        "bg-gradient-to-br from-orange-500 to-orange-600",
                        "bg-gradient-to-br from-pink-500 to-pink-600",
                        "bg-gradient-to-br from-indigo-500 to-indigo-600",
                      ];
                      const index = name.charCodeAt(0) % colors.length;
                      return colors[index];
                    };

                    return (
                      <TableRow key={lead.id} className="group hover:bg-purple-50/50 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className={`h-9 w-9 flex-shrink-0 ${getAvatarColor(lead.name)}`}>
                              <AvatarFallback className="text-white font-semibold bg-transparent text-xs">
                                {getInitials(lead.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-gray-900 font-medium truncate">{lead.name || "Anonymous"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.email ? (
                            <a 
                              href={`mailto:${lead.email}`}
                              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors break-all"
                            >
                              {lead.email}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <a 
                              href={`tel:${lead.phone}`}
                              className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors font-mono"
                            >
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.message ? (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {lead.message}
                            </p>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                          {format(new Date(lead.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {lead.conversationId && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleViewConversation(lead.conversationId!)}
                                title="View conversation"
                                className="h-8 w-8 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(lead.id)}
                              data-testid={`button-delete-${lead.id}`}
                              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
