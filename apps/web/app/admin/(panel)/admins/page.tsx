import { listAdmins } from '@bahikhata/db';
import { TBody, TD, TH, THead, TR, Table } from '@bahikhata/ui';
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
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admins</h1>
        <p className="text-sm text-muted-foreground">
          Admins can see every business on Bahikhata and can suspend one. Keep this list short.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Current admins</h2>
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
      </section>

      <section className="max-w-md space-y-3 rounded-lg border p-5">
        <div>
          <h2 className="text-base font-medium">Add an admin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            They need a Bahikhata account first — ask them to sign up, then enter the same email
            here. Nothing is emailed out; they simply get the Admin panel link the next time they
            log in.
          </p>
        </div>
        <GrantAdminForm />
      </section>
    </div>
  );
}
