import { PageSection } from "@/components/page-section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsRoute() {
  return (
    <main className="p-6">
      <PageSection
        title="Settings"
        description="인증, daemon 연결, 공유 정책 설정을 둘 자리입니다."
      >
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Placeholder settings surface</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Settings content will live here.
          </CardContent>
        </Card>
      </PageSection>
    </main>
  );
}
