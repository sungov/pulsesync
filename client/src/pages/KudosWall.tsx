import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, Award, Star, Users, Lightbulb, Zap,
  HandHeart, Trophy, Send, Eye, EyeOff, Search,
  Crown, Medal, User, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const VALUE_TAGS = [
  { value: "Teamwork", icon: Users, color: "text-blue-500" },
  { value: "Innovation", icon: Lightbulb, color: "text-amber-500" },
  { value: "Leadership", icon: Star, color: "text-purple-500" },
  { value: "Going the Extra Mile", icon: Zap, color: "text-emerald-500" },
  { value: "Mentorship", icon: HandHeart, color: "text-rose-500" },
  { value: "Problem Solving", icon: Award, color: "text-cyan-500" },
];

function getInitials(name: string) {
  return name?.split(" ").map(w => w[0]).join("").toUpperCase() || "?";
}

function getValueIcon(tag: string) {
  const found = VALUE_TAGS.find(v => v.value === tag);
  if (found) {
    const Icon = found.icon;
    return <Icon className={`w-3.5 h-3.5 ${found.color}`} />;
  }
  return <Heart className="w-3.5 h-3.5 text-rose-500" />;
}

const RANK_STYLES = [
  { bg: "linear-gradient(135deg, #f59e0b, #d97706)", icon: Crown },
  { bg: "linear-gradient(135deg, #94a3b8, #64748b)", icon: Medal },
  { bg: "linear-gradient(135deg, #d97706, #92400e)", icon: Medal },
];

const RANK_LABELS = ["1st", "2nd", "3rd"];

interface RankedEntry {
  userId: string;
  fullName: string;
  deptCode: string;
  role: string;
  kudosCount: number;
  rank: number;
}

function assignRanks(entries: any[]): RankedEntry[] {
  if (!entries || entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => b.kudosCount - a.kudosCount);
  const ranked: RankedEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].kudosCount < sorted[i - 1].kudosCount) {
      currentRank = i + 1;
    }
    if (currentRank > 3) break;
    ranked.push({ ...sorted[i], rank: currentRank });
  }
  return ranked;
}

export default function KudosWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("wall");

  const [showGiveKudos, setShowGiveKudos] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [kudosMessage, setKudosMessage] = useState("");
  const [selectedTag, setSelectedTag] = useState("Teamwork");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [wallRange, setWallRange] = useState("month");
  const [leaderboardRange, setLeaderboardRange] = useState("quarter");

  const { data: recentKudos, isLoading: kudosLoading } = useQuery<any[]>({
    queryKey: ["/api/kudos/recent", wallRange],
    queryFn: async () => {
      const res = await fetch(`/api/kudos/recent?limit=50&range=${wallRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch kudos");
      return res.json();
    },
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<any[]>({
    queryKey: ["/api/kudos/leaderboard", leaderboardRange],
    queryFn: async () => {
      const res = await fetch(`/api/kudos/leaderboard?range=${leaderboardRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const rankedLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    const withCount = leaderboard.map((d: any) => ({ ...d, kudosCount: Number(d.kudosCount) }));
    return assignRanks(withCount);
  }, [leaderboard]);

  const { data: myKudos, isLoading: myKudosLoading } = useQuery<any[]>({
    queryKey: ["/api/kudos/user", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/kudos/user/${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch my kudos");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const myReceivedKudos = useMemo(() => {
    if (!myKudos || !user) return [];
    return myKudos.filter((k: any) => k.receiverUserId === user.id);
  }, [myKudos, user]);

  const mySentKudos = useMemo(() => {
    if (!myKudos || !user) return [];
    return myKudos.filter((k: any) => k.giverUserId === user.id);
  }, [myKudos, user]);

  const [myKudosSubTab, setMyKudosSubTab] = useState<"received" | "sent">("received");

  const { data: allUsers } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const eligibleReceivers = useMemo(() => {
    if (!allUsers || !user) return [];
    return allUsers
      .filter(u => u.id !== user.id && !u.isAdmin)
      .map(u => ({ id: u.id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email, dept: u.deptCode }))
      .filter(u => !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allUsers, user, searchQuery]);

  const giveKudosMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to give kudos");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kudos Sent!", description: "Your recognition has been shared." });
      setShowGiveKudos(false);
      setKudosMessage("");
      setSelectedReceiver("");
      setSelectedTag("Teamwork");
      setIsAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ["/api/kudos/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kudos/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kudos/user"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleGiveKudos = () => {
    if (!selectedReceiver || !kudosMessage.trim()) {
      toast({ title: "Missing Fields", description: "Please select a person and write a message.", variant: "destructive" });
      return;
    }
    giveKudosMutation.mutate({
      receiverUserId: selectedReceiver,
      message: kudosMessage.trim(),
      valueTag: selectedTag,
      isAnonymous,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-kudos-title">
            Recognition Wall
          </h1>
          <p className="text-muted-foreground mt-1">Celebrate your colleagues' contributions</p>
        </div>
        <Button
          onClick={() => setShowGiveKudos(!showGiveKudos)}
          data-testid="button-give-kudos"
        >
          <Heart className="w-4 h-4 mr-2" />
          Give Kudos
        </Button>
      </header>

      {showGiveKudos && (
        <Card className="border-border/50 shadow-sm overflow-visible" data-testid="card-give-kudos-form">
          <div className="h-2 bg-gradient-to-r from-rose-500 to-pink-400 rounded-t-md" />
          <CardHeader>
            <CardTitle className="text-lg">Send Recognition</CardTitle>
            <CardDescription>Recognize a colleague for their great work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Who are you recognizing?</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-recipient"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  {eligibleReceivers.slice(0, 10).map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                        selectedReceiver === r.id ? "bg-primary/10 text-primary" : "hover-elevate"
                      }`}
                      onClick={() => setSelectedReceiver(r.id)}
                      data-testid={`button-select-receiver-${r.id}`}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(r.name)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{r.name}</span>
                      {r.dept && <Badge variant="outline" className="text-xs">{r.dept}</Badge>}
                    </button>
                  ))}
                  {eligibleReceivers.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3 text-center">No users found</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Company Value</Label>
              <div className="flex flex-wrap gap-2">
                {VALUE_TAGS.map(tag => {
                  const Icon = tag.icon;
                  return (
                    <Button
                      key={tag.value}
                      type="button"
                      variant={selectedTag === tag.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTag(tag.value)}
                      data-testid={`button-tag-${tag.value.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Icon className="w-3.5 h-3.5 mr-1.5" />
                      {tag.value}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kudosMsg">Your message</Label>
              <Textarea
                id="kudosMsg"
                placeholder="What did they do that was awesome?"
                className="min-h-[80px] resize-none focus-visible:ring-primary"
                value={kudosMessage}
                onChange={(e) => setKudosMessage(e.target.value)}
                maxLength={500}
                data-testid="textarea-kudos-message"
              />
              <p className="text-xs text-muted-foreground text-right">{kudosMessage.length}/500</p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors"
                onClick={() => setIsAnonymous(!isAnonymous)}
                data-testid="button-toggle-anonymous"
              >
                {isAnonymous ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4" />}
                {isAnonymous ? "Sending anonymously" : "Your name will be visible"}
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowGiveKudos(false)} data-testid="button-cancel-kudos">Cancel</Button>
                <Button onClick={handleGiveKudos} disabled={giveKudosMutation.isPending} data-testid="button-send-kudos">
                  <Send className="w-4 h-4 mr-2" />
                  {giveKudosMutation.isPending ? "Sending..." : "Send Kudos"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-kudos-view">
          <TabsTrigger value="wall" data-testid="tab-kudos-wall">
            <Heart className="w-4 h-4 mr-1.5" /> Wall
          </TabsTrigger>
          <TabsTrigger value="mykudos" data-testid="tab-kudos-mykudos">
            <User className="w-4 h-4 mr-1.5" /> My Kudos
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-kudos-leaderboard">
            <Trophy className="w-4 h-4 mr-1.5" /> Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wall" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {recentKudos ? `${recentKudos.length} recognition${recentKudos.length !== 1 ? "s" : ""}` : ""}
            </p>
            <Select value={wallRange} onValueChange={setWallRange}>
              <SelectTrigger className="w-[140px]" data-testid="select-wall-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kudosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : !recentKudos || recentKudos.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-lg font-medium text-foreground">No kudos this period</p>
                <p className="text-sm text-muted-foreground">Be the first to recognize a colleague!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentKudos.map((k: any) => (
                <Card key={k.id} className="border-border/50 overflow-visible" data-testid={`card-kudos-${k.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {k.isAnonymous ? "?" : getInitials(k.giverName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {k.isAnonymous ? "Someone" : k.giverName}
                          </span>
                          <span className="text-xs text-muted-foreground">recognized</span>
                          <span className="text-sm font-semibold text-primary">{k.receiverName}</span>
                        </div>
                        <p className="text-sm text-foreground/80">{k.message}</p>
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getValueIcon(k.valueTag)}
                            <span className="ml-1">{k.valueTag}</span>
                          </Badge>
                          {k.receiverDept && (
                            <Badge variant="outline" className="text-xs">{k.receiverDept}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {k.createdAt ? formatDistanceToNow(new Date(k.createdAt), { addSuffix: true }) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mykudos" className="mt-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant={myKudosSubTab === "received" ? "default" : "outline"}
              size="sm"
              onClick={() => setMyKudosSubTab("received")}
              data-testid="button-my-received"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1.5" />
              Received ({myReceivedKudos.length})
            </Button>
            <Button
              variant={myKudosSubTab === "sent" ? "default" : "outline"}
              size="sm"
              onClick={() => setMyKudosSubTab("sent")}
              data-testid="button-my-sent"
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
              Sent ({mySentKudos.length})
            </Button>
          </div>

          {myKudosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3].map(i => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (() => {
            const items = myKudosSubTab === "received" ? myReceivedKudos : mySentKudos;
            if (items.length === 0) {
              return (
                <Card className="border-border/50">
                  <CardContent className="py-12 text-center">
                    {myKudosSubTab === "received" ? (
                      <>
                        <ArrowDownLeft className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-lg font-medium text-foreground">No kudos received yet</p>
                        <p className="text-sm text-muted-foreground">Keep up the great work and recognition will follow!</p>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-lg font-medium text-foreground">No kudos sent yet</p>
                        <p className="text-sm text-muted-foreground">Recognize a colleague to get started!</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((k: any) => (
                  <Card key={k.id} className="border-border/50 overflow-visible" data-testid={`card-mykudos-${k.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {myKudosSubTab === "received"
                              ? (k.isAnonymous ? "?" : getInitials(k.giverName))
                              : getInitials(k.receiverName)
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {myKudosSubTab === "received" ? (
                              <>
                                <span className="text-sm font-semibold text-foreground">
                                  {k.isAnonymous ? "Someone" : k.giverName}
                                </span>
                                <span className="text-xs text-muted-foreground">recognized you</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-muted-foreground">You recognized</span>
                                <span className="text-sm font-semibold text-primary">{k.receiverName}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80">{k.message}</p>
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <Badge variant="secondary" className="text-xs">
                              {getValueIcon(k.valueTag)}
                              <span className="ml-1">{k.valueTag}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {k.createdAt ? formatDistanceToNow(new Date(k.createdAt), { addSuffix: true }) : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top Recognized Employees
            </h2>
            <Select value={leaderboardRange} onValueChange={setLeaderboardRange}>
              <SelectTrigger className="w-[140px]" data-testid="select-leaderboard-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {leaderboardLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : rankedLeaderboard.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-lg font-medium text-foreground">No recognition data</p>
                <p className="text-sm text-muted-foreground">Start giving kudos to see the leaderboard</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rankedLeaderboard.map((entry, idx) => {
                const rankIdx = entry.rank - 1;
                const style = RANK_STYLES[rankIdx];
                const RankIcon = style?.icon || Medal;
                return (
                  <Card key={entry.userId} className="border-border/50 overflow-visible" data-testid={`card-leaderboard-${idx}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                        style={{ background: style.bg, color: "white" }}
                      >
                        <RankIcon className="w-4 h-4" />
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{RANK_LABELS[rankIdx]}</Badge>
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(entry.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{entry.fullName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.deptCode && <span className="text-xs text-muted-foreground">{entry.deptCode}</span>}
                          <Badge variant="outline" className="text-xs">{entry.role?.replace("_", " ")}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span className="text-lg font-bold text-foreground" data-testid={`text-kudos-count-${idx}`}>{entry.kudosCount}</span>
                        <span className="text-xs text-muted-foreground">kudos</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
