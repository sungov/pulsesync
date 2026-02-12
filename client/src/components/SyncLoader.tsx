import { motion } from "framer-motion";

export function SyncLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <motion.div 
            className="absolute inset-0 rounded-full border-4 border-primary/20"
          />
          <motion.div 
            className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold animate-pulse">
               AI
             </div>
          </div>
        </div>
        <h3 className="text-xl font-display font-bold text-foreground mb-2">Syncing Data</h3>
        <p className="text-sm text-muted-foreground">
          Analyzing inputs with Neural Engine...
        </p>
      </div>
    </div>
  );
}
