import { useAuth } from "@/hooks/use-auth";
import { useUsersList, useBurnoutRadar, useCreateActionItem } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Plus, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data: teamMembers } = useUsersList("EMPLOYEE", user?.email || "");
  const { data: burnoutData } = useBurnoutRadar();
  const createActionItem = useCreateActionItem();
  const { toast } = useToast();
  
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleCreateTask = async () => {
    if (!selectedEmployee || !taskContent || !dueDate || !user?.email) return;

    await createActionItem.mutateAsync({
      empEmail: selectedEmployee,
      mgrEmail: user.email,
      task: taskContent,
      dueDate: new Date(dueDate),
      status: "Pending"
    });
    setTaskDialogOpen(false);
    setTaskContent("");
    setDueDate("");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Team Pulse</h1>
          <p className="text-muted-foreground mt-2">Monitoring {teamMembers?.length || 0} team members</p>
        </div>
        
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Assign Action Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Action Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers?.map(member => (
                      <SelectItem key={member.id} value={member.email || ""}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Task Description</Label>
                <Input value={taskContent} onChange={e => setTaskContent(e.target.value)} placeholder="e.g. Complete compliance training" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTask} disabled={createActionItem.isPending}>
                {createActionItem.isPending ? "Assigning..." : "Assign Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Burnout Radar Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Burnout Radar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {burnoutData?.map((risk: any) => (
            <Card key={risk.userId} className={`border-l-4 ${risk.riskLevel === 'High' ? 'border-l-destructive' : risk.riskLevel === 'Medium' ? 'border-l-orange-400' : 'border-l-green-400'} shadow-sm hover:shadow-md transition-all`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{risk.fullName.split(' ').map((n:any) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{risk.fullName}</CardTitle>
                      <CardDescription>Risk Level: <span className={risk.riskLevel === 'High' ? 'text-destructive font-bold' : ''}>{risk.riskLevel}</span></CardDescription>
                    </div>
                  </div>
                  {risk.dropPercentage > 10 && (
                    <Badge variant="destructive" className="animate-pulse">
                      -{risk.dropPercentage}% Drop
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-muted/50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">Current Mood</p>
                    <p className="text-2xl font-bold">{risk.currentSentiment ?? '-'}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">Previous</p>
                    <p className="text-2xl font-bold text-muted-foreground">{risk.previousSentiment ?? '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!burnoutData || burnoutData.length === 0) && (
             <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
               <p className="text-muted-foreground">No significant burnout risks detected this period.</p>
             </div>
          )}
        </div>
      </section>

      {/* Team Overview */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Team Overview</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Department</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-6 py-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {teamMembers?.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">{member.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{(member as any).deptCode || 'Engineering'}</td>
                    <td className="px-6 py-4"><Badge variant="outline">{(member as any).role}</Badge></td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">View History</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
