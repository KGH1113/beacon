import { PageSection } from "@/components/page-section";
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
  formatShareExpiry,
  getSharesDescription,
  mockShares,
} from "./shares.lib";

export function SharesPage() {
  return (
    <PageSection title="Shares" description={getSharesDescription()}>
      <Card>
        <CardHeader>
          <CardTitle>Active Shares</CardTitle>
          <CardDescription>
            {mockShares.length} links currently available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockShares.map((share) => (
                <TableRow key={share.id}>
                  <TableCell className="font-medium">
                    {share.fileName}
                  </TableCell>
                  <TableCell>/s/{share.token}</TableCell>
                  <TableCell className="text-right">
                    {formatShareExpiry(share.expiresAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageSection>
  );
}
