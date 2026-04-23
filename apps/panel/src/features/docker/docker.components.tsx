import { PageSection } from "@/components/page-section";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getDockerDescription,
  getDockerStateLabel,
  mockDockerContainers,
  mockDockerLogs,
} from "./docker.lib";

export function DockerPage() {
  return (
    <PageSection title="Docker" description={getDockerDescription()}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Containers</CardTitle>
            <CardDescription>
              {mockDockerContainers.length} containers discovered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDockerContainers.map((container) => (
                  <TableRow key={container.id}>
                    <TableCell className="font-medium">
                      {container.name}
                    </TableCell>
                    <TableCell>{container.image}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          container.state === "running"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {getDockerStateLabel(container.state)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {container.status}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
            <CardDescription>Mock tail output</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 font-mono text-xs">
            {mockDockerLogs.map((line) => (
              <p className="rounded bg-muted px-2 py-1" key={line}>
                {line}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
}
