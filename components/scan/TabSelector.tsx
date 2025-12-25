import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TabSelectorProps {
  activeTab: 'rsi' | 'funding';
  onTabChange: (tab: 'rsi' | 'funding') => void;
  rsiCount?: number;
  rsiTotal?: number;
  fundingCount?: number;
}

export function TabSelector({
  activeTab,
  onTabChange,
  rsiCount = 0,
  rsiTotal = 0,
  fundingCount = 0,
}: TabSelectorProps) {
  const hasRSIData = rsiCount > 0 || rsiTotal > 0;
  const hasFundingData = fundingCount > 0;

  if (!hasRSIData && !hasFundingData) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'rsi' ? "default" : "ghost"}
            onClick={() => onTabChange('rsi')}
            className={`rounded-b-none ${activeTab === 'rsi' ? 'border-b-2 border-primary' : ''}`}
          >
            RSI Scan
            {hasRSIData && (
              <span className="ml-2 text-xs opacity-70">
                ({rsiCount} / {rsiTotal})
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'funding' ? "default" : "ghost"}
            onClick={() => onTabChange('funding')}
            className={`rounded-b-none ${activeTab === 'funding' ? 'border-b-2 border-primary' : ''}`}
          >
            Funding Scan
            {hasFundingData && (
              <span className="ml-2 text-xs opacity-70">
                ({fundingCount})
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}



