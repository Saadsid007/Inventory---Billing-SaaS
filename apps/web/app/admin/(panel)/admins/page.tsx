import { listAdmins } from '@billwise/db';
import {
  Card,
  PageBody,
  PageHeader,
  Section,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth/require-business';
import { GrantAdminForm, RevokeAdminButton } from './admin-accounts';

export const metadata: Metadata = { title: 'Admins' };

/**
 * Who can get into this panel.
 *
 * An admin here can suspend a paying shop, so the list is deliberately small
 * and visible: everyone who has the power can see everyone else who has it.
 */
export default async function AdminsPage() {
  const me = await requireSuperAdmin();
  const admins = await listAdmins();

  return (
    <PageBody className="mx-auto max-w-4xl p-6 sm:p-8">
      <PageHeader
        title="Admins"
        description="Admins can see every business on Billwise and can suspend one. Keep this list short."
      />

      <Section title="Current admins">
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Admin since</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {admins.map((a) => (
              <TR key={a.id}>
                <TD>
                  <span className="font-medium">{a.name}</span>
                  {a.businessCount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      also runs {a.businessCount === 1 ? 'a shop' : `${a.businessCount} shops`}
                    </span>
                  )}
                </TD>
                <TD className="text-muted-foreground">{a.email}</TD>
                <TD className="text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TD>
                <TD>
                  <RevokeAdminButton userId={a.id} name={a.name} isSelf={a.id === me.id} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>

      <Card className="max-w-md space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold">Add an admin</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            They need a Billwise account first — ask them to sign up, then enter the same email
            here. Nothing is emailed out; they simply get the Admin panel link the next time they
            log in.
          </p>
        </div>
        <GrantAdminForm />
      </Card>
    </PageBody>
  );
}
