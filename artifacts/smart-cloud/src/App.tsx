import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import { I18nProvider } from "@/lib/i18n";

// Pages
import Dashboard from "@/pages/dashboard";
import Storage from "@/pages/storage";
import Files from "@/pages/files";
import Ai from "@/pages/ai";
import Connections from "@/pages/connections";
import Settings from "@/pages/settings";
import Setup from "@/pages/setup";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/storage" component={Storage} />
        <Route path="/files" component={Files} />
        <Route path="/ai" component={Ai} />
        <Route path="/connections" component={Connections} />
        <Route path="/settings" component={Settings} />
        <Route path="/setup" component={Setup} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
