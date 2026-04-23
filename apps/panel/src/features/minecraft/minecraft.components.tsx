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
  getMinecraftDescription,
  getMinecraftStatusLabel,
  mockMinecraftServers,
  mockRconOutput,
} from "./minecraft.lib";

export function MinecraftPage() {
  return (
    <PageSection title="Minecraft" description={getMinecraftDescription()}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Servers</CardTitle>
            <CardDescription>
              {mockMinecraftServers.filter((server) => server.online).length}{" "}
              online servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMinecraftServers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell>
                      {server.host}:{server.port}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={server.online ? "secondary" : "outline"}>
                        {getMinecraftStatusLabel(server.online)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>RCON</CardTitle>
            <CardDescription>Recent command output</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 font-mono text-xs">
            {mockRconOutput.map((line) => (
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
