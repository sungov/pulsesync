import { useDepartmentAnalytics } from "@/hooks/use-pulse-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Users, TrendingUp, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function ExecutiveDashboard() {
  const { data: deptData } = useDepartmentAnalytics();
  const { toast } = useToast();

  const handleNudge = () => {
    toast({
      title: "Nudge Sent",
      description: "Reminder emails sent to managers with pending reviews.",
    });
  };

  const chartData = deptData?.map(d => ({
    name: d.deptCode || "General",
    satisfaction: d.avgSatScore,
    mood: d.avgMoodScore,
    amt: d.totalFeedback
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Executive Hub</h1>
          <p className="text-muted-foreground mt-2">Organization-wide performance intelligence</p>
        </div>
        <Button onClick={handleNudge} size="lg" className="shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700">
          <Send className="w-4 h-4 mr-2" /> Nudge Managers
        </Button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-xl"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/10 rounded-lg"><Users className="w-6 h-6" /></div>
            <span className="text-indigo-100 text-sm font-medium">vs last month</span>
          </div>
          <h3 className="text-4xl font-bold mb-1">8.4</h3>
          <p className="text-indigo-100 opacity-90">Org Satisfaction Score</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-card border border-border p-6 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
            <span className="text-green-600 text-sm font-medium flex items-center">+12% <TrendingUp className="w-3 h-3 ml-1" /></span>
          </div>
          <h3 className="text-4xl font-bold text-foreground mb-1">92%</h3>
          <p className="text-muted-foreground">Participation Rate</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-card border border-border p-6 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Building2 className="w-6 h-6" /></div>
            <span className="text-muted-foreground text-sm font-medium">Active Depts</span>
          </div>
          <h3 className="text-4xl font-bold text-foreground mb-1">{deptData?.length || 0}</h3>
          <p className="text-muted-foreground">Departments Tracking</p>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Department Sentiment Analysis</CardTitle>
            <CardDescription>Average Satisfaction vs Mood Scores by Department</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="satisfaction" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Satisfaction" />
                  <Bar dataKey="mood" fill="#818cf8" radius={[4, 4, 0, 0]} name="Mood" />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
