'use client';

import {
  DEFAULT_STOREFRONT_CONFIG,
  type StorefrontAccent,
  type StorefrontConfig,
  type StorefrontTemplate,
} from '@billwise/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@billwise/ui';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Layout,
  PackageCheck,
  Paintbrush,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
} from 'lucide-react';
import * as React from 'react';
import { saveStorefrontCustomizationAction } from './actions';

const TEMPLATES: {
  id: StorefrontTemplate;
  title: string;
  subtitle: string;
  icon: string;
  tone: string;
}[] = [
  {
    id: 'modern_kirana',
    title: 'Modern Retail & Kirana',
    subtitle: 'Optimized for local Indian stores, high-converting WhatsApp orders & counter pickup.',
    icon: '🛒',
    tone: 'Emerald & Warm Stone',
  },
  {
    id: 'supermarket',
    title: 'Supermarket & Mart',
    subtitle: 'Dense product grid, vibrant deals, bold category pills & high item turnover.',
    icon: '🏬',
    tone: 'Indigo & Royal Blue',
  },
  {
    id: 'organic_fresh',
    title: 'Organic & Daily Fresh',
    subtitle: 'Eco-friendly aesthetic, farm-fresh badges, wholesome natural feel.',
    icon: '🌿',
    tone: 'Amber & Olive Earth',
  },
  {
    id: 'boutique',
    title: 'Premium Gourmet & Boutique',
    subtitle: 'Luxury aesthetic with subtle dark glassmorphic accents & gold borders.',
    icon: '✨',
    tone: 'Violet & Gold Luxe',
  },
];

const ACCENT_COLORS: {
  id: StorefrontAccent;
  label: string;
  bg: string;
  ring: string;
}[] = [
  { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
  { id: 'blue', label: 'Sapphire Blue', bg: 'bg-blue-600', ring: 'ring-blue-500' },
  { id: 'indigo', label: 'Royal Indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-500' },
  { id: 'amber', label: 'Sunset Amber', bg: 'bg-amber-600', ring: 'ring-amber-500' },
  { id: 'rose', label: 'Rose Ruby', bg: 'bg-rose-600', ring: 'ring-rose-500' },
  { id: 'violet', label: 'Royal Violet', bg: 'bg-violet-600', ring: 'ring-violet-500' },
];

export function StorefrontCustomizer({
  initialConfig,
  businessName,
  slug,
  phone,
  logoUrl: initialLogoUrl,
  catalogWhatsapp: initialWhatsapp,
  showCatalogPrices: initialShowPrices,
  catalogEnabled: initialCatalogEnabled,
  city,
  addressLine1,
}: {
  initialConfig: StorefrontConfig | null;
  businessName: string;
  slug: string;
  phone: string | null;
  logoUrl: string | null;
  catalogWhatsapp: string | null;
  showCatalogPrices: boolean;
  catalogEnabled: boolean;
  city: string | null;
  addressLine1: string | null;
}) {
  const [config, setConfig] = React.useState<StorefrontConfig>({
    ...DEFAULT_STOREFRONT_CONFIG,
    ...initialConfig,
  });

  const [logoUrl, setLogoUrl] = React.useState(initialLogoUrl ?? '');
  const [whatsapp, setWhatsapp] = React.useState(initialWhatsapp ?? '');
  const [showPrices, setShowPrices] = React.useState(initialShowPrices);
  const [catalogEnabled, setCatalogEnabled] = React.useState(initialCatalogEnabled);

  const [device, setDevice] = React.useState<'desktop' | 'mobile'>('desktop');
  const [isPending, startTransition] = React.useTransition();
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const updateField = <K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSaveStatus('idle');
    setErrorMessage(null);

    startTransition(async () => {
      const res = await saveStorefrontCustomizationAction({
        config,
        catalogWhatsapp: whatsapp || null,
        showCatalogPrices: showPrices,
        catalogEnabled,
        logoUrl: logoUrl || null,
      });

      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 4000);
      } else {
        setSaveStatus('error');
        setErrorMessage(res.error ?? 'Error saving settings.');
      }
    });
  };

  const fullAddress = [addressLine1, city].filter(Boolean).join(', ');
  const storeUrl = `/store/${slug}`;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Storefront Studio & Customization
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Enterprise
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Design your public storefront, customize templates, branding, header announcements, trust badges, and WhatsApp order flows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-card px-3.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
          >
            <Globe className="size-3.5 text-muted-foreground" />
            <span>View Live Store</span>
            <ExternalLink className="size-3 opacity-60" />
          </a>

          <Button
            onClick={handleSave}
            disabled={isPending}
            className="h-9 gap-2 rounded-xl bg-primary px-4 text-xs font-bold shadow-xs hover:bg-primary-hover active:scale-98"
          >
            {isPending ? (
              <span>Saving...</span>
            ) : saveStatus === 'success' ? (
              <>
                <Check className="size-3.5 text-emerald-300" />
                <span>Published!</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Save & Publish</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {saveStatus === 'success' && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>Your storefront customizations have been published live! Customers visiting your store URL will see these updates immediately.</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-700">
          {errorMessage || 'Failed to publish changes. Please try again.'}
        </div>
      )}

      {/* Main Studio Grid: Editor Tabs (Left) + Live Interactive Preview (Right) */}
      <div className="grid gap-8 xl:grid-cols-12">
        {/* Editor Controls (7 columns) */}
        <div className="xl:col-span-7 space-y-6">
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList className="grid grid-cols-5 h-auto p-1 bg-muted/60 rounded-2xl">
              <TabsTrigger value="templates" className="rounded-xl py-2 text-xs font-semibold">
                Templates
              </TabsTrigger>
              <TabsTrigger value="branding" className="rounded-xl py-2 text-xs font-semibold">
                Branding
              </TabsTrigger>
              <TabsTrigger value="header" className="rounded-xl py-2 text-xs font-semibold">
                Header
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-xl py-2 text-xs font-semibold">
                Catalog & Stock
              </TabsTrigger>
              <TabsTrigger value="trust" className="rounded-xl py-2 text-xs font-semibold">
                Trust & Footer
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TEMPLATES & COLORS */}
            <TabsContent value="templates" className="space-y-6 mt-0">
              <Card className="rounded-3xl border shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Layout className="size-4 text-primary" />
                    Storefront Theme Templates
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose an industry-crafted theme designed to maximize customer trust and WhatsApp orders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TEMPLATES.map((tmpl) => {
                      const isSelected = (config.template ?? 'modern_kirana') === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => updateField('template', tmpl.id)}
                          className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/25 bg-primary/5 shadow-xs'
                              : 'bg-card hover:border-border hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{tmpl.icon}</span>
                            {isSelected && (
                              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                <Check className="size-3" />
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-foreground mt-2">{tmpl.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tmpl.subtitle}</p>
                          <div className="mt-3 pt-2 border-t text-[11px] font-medium text-primary">
                            Style: {tmpl.tone}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Accent Color Palette */}
                  <div className="pt-4 border-t space-y-3">
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Paintbrush className="size-4 text-primary" />
                        Brand Accent Color
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Used for badges, highlights, and primary storefront buttons.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      {ACCENT_COLORS.map((col) => {
                        const isChosen = (config.accentColor ?? 'emerald') === col.id;
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => updateField('accentColor', col.id)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                              isChosen
                                ? 'border-primary ring-2 ring-primary/25 bg-card shadow-2xs'
                                : 'bg-card/60 hover:bg-muted'
                            }`}
                          >
                            <span className={`size-3.5 rounded-full ${col.bg}`} />
                            <span>{col.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: BRANDING & IDENTITY */}
            <TabsContent value="branding" className="space-y-6 mt-0">
              <Card className="rounded-3xl border shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Store className="size-4 text-primary" />
                    Store Identity & Logos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Showcase your brand identity so customers immediately recognize your store.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border p-4 bg-muted/20">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Online Store Status (Live / Public)</p>
                      <p className="text-[11px] text-muted-foreground">
                        When enabled, your store is publicly accessible at /store/{slug}.
                      </p>
                    </div>
                    <Switch checked={catalogEnabled} onCheckedChange={setCatalogEnabled} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Store Display Tagline</label>
                    <Input
                      value={config.tagline ?? ''}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      placeholder="e.g. Kanpur's Trusted Neighborhood Kirana Store"
                      className="rounded-xl text-xs h-10"
                    />
                    <p className="text-[11px] text-muted-foreground">Appears under your store name in the footer and meta tags.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Store Logo URL</label>
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://.../logo.png"
                      className="rounded-xl text-xs h-10"
                    />
                    <p className="text-[11px] text-muted-foreground">Direct image URL for your shop icon or logo.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Verified Badge Label</label>
                      <Input
                        value={config.badgeText ?? ''}
                        onChange={(e) => updateField('badgeText', e.target.value)}
                        placeholder="e.g. Verified Local Merchant"
                        className="rounded-xl text-xs h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">WhatsApp Order Phone Number</label>
                      <Input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="e.g. 9839112204"
                        className="rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: HEADER & NAVIGATION */}
            <TabsContent value="header" className="space-y-6 mt-0">
              <Card className="rounded-3xl border shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Announcement Bar & Store Header
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure the top banner that visitors see immediately upon landing on your site.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between rounded-2xl border p-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Show Top Announcement Bar</p>
                      <p className="text-[11px] text-muted-foreground">
                        Display a high-visibility banner for discounts, timings, and delivery notices.
                      </p>
                    </div>
                    <Switch
                      checked={config.showAnnouncement ?? true}
                      onCheckedChange={(c) => updateField('showAnnouncement', c)}
                    />
                  </div>

                  {config.showAnnouncement !== false && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Announcement Message</label>
                      <Input
                        value={config.announcementText ?? ''}
                        onChange={(e) => updateField('announcementText', e.target.value)}
                        placeholder="⚡ Live Catalog & Instant WhatsApp Orders • Fast Counter Pickup in Kanpur"
                        className="rounded-xl text-xs h-10"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Store Operating Hours</label>
                    <Input
                      value={config.storeTimings ?? ''}
                      onChange={(e) => updateField('storeTimings', e.target.value)}
                      placeholder="e.g. Open 8:00 AM – 10:00 PM Daily"
                      className="rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="rounded-2xl bg-muted/40 p-4 border text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">Header Action Buttons</p>
                    <p>The header automatically features your direct <strong>Call Store</strong> button and <strong>Chat on WhatsApp</strong> button based on your business phone and WhatsApp number.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: PRODUCTS & STOCK */}
            <TabsContent value="products" className="space-y-6 mt-0">
              <Card className="rounded-3xl border shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <PackageCheck className="size-4 text-primary" />
                    Product Cards & Stock Display
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Control how stock quantities, prices, and WhatsApp order buttons appear on product cards.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between rounded-2xl border p-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Show Available Stock Count</p>
                      <p className="text-[11px] text-muted-foreground">
                        Show exact inventory number (e.g. <code>🟢 60 in stock</code> or <code>60 units available</code>).
                      </p>
                    </div>
                    <Switch
                      checked={config.showStockCount ?? true}
                      onCheckedChange={(c) => updateField('showStockCount', c)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border p-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Low Stock Urgency Alert</p>
                      <p className="text-[11px] text-muted-foreground">
                        Show a flame badge <code>🔥 Only 4 left!</code> when inventory is 10 or less to create healthy buyer urgency.
                      </p>
                    </div>
                    <Switch
                      checked={config.showLowStockUrgency ?? true}
                      onCheckedChange={(c) => updateField('showLowStockUrgency', c)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border p-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Display Product Prices</p>
                      <p className="text-[11px] text-muted-foreground">
                        Show retail prices on the catalog. (Turn off for wholesale enquiry mode).
                      </p>
                    </div>
                    <Switch checked={showPrices} onCheckedChange={setShowPrices} />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-foreground">Custom Order Button Label</label>
                    <Input
                      value={config.orderButtonText ?? ''}
                      onChange={(e) => updateField('orderButtonText', e.target.value)}
                      placeholder="Order on WhatsApp"
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: TRUST BADGES & FOOTER */}
            <TabsContent value="trust" className="space-y-6 mt-0">
              <Card className="rounded-3xl border shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    Customer Trust Badges & Footer
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Highlight why customers should buy from your shop instead of distant marketplaces.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 p-3 rounded-2xl border bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Badge 1 (WhatsApp)</span>
                      <Input
                        value={config.trustBadge1Title ?? ''}
                        onChange={(e) => updateField('trustBadge1Title', e.target.value)}
                        placeholder="WhatsApp Order"
                        className="rounded-lg text-xs h-8"
                      />
                      <Input
                        value={config.trustBadge1Subtitle ?? ''}
                        onChange={(e) => updateField('trustBadge1Subtitle', e.target.value)}
                        placeholder="1-Tap order directly"
                        className="rounded-lg text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5 p-3 rounded-2xl border bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Badge 2 (Authenticity)</span>
                      <Input
                        value={config.trustBadge2Title ?? ''}
                        onChange={(e) => updateField('trustBadge2Title', e.target.value)}
                        placeholder="100% Genuine"
                        className="rounded-lg text-xs h-8"
                      />
                      <Input
                        value={config.trustBadge2Subtitle ?? ''}
                        onChange={(e) => updateField('trustBadge2Subtitle', e.target.value)}
                        placeholder="Company sealed packs"
                        className="rounded-lg text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5 p-3 rounded-2xl border bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Badge 3 (Pickup)</span>
                      <Input
                        value={config.trustBadge3Title ?? ''}
                        onChange={(e) => updateField('trustBadge3Title', e.target.value)}
                        placeholder="Counter Pickup"
                        className="rounded-lg text-xs h-8"
                      />
                      <Input
                        value={config.trustBadge3Subtitle ?? ''}
                        onChange={(e) => updateField('trustBadge3Subtitle', e.target.value)}
                        placeholder="Ready in 15 mins"
                        className="rounded-lg text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5 p-3 rounded-2xl border bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Badge 4 (Payment)</span>
                      <Input
                        value={config.trustBadge4Title ?? ''}
                        onChange={(e) => updateField('trustBadge4Title', e.target.value)}
                        placeholder="Cash & UPI"
                        className="rounded-lg text-xs h-8"
                      />
                      <Input
                        value={config.trustBadge4Subtitle ?? ''}
                        onChange={(e) => updateField('trustBadge4Subtitle', e.target.value)}
                        placeholder="GPay, PhonePe & Cash"
                        className="rounded-lg text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-foreground">Delivery & Service Area Notice</label>
                    <Input
                      value={config.deliveryNotice ?? ''}
                      onChange={(e) => updateField('deliveryNotice', e.target.value)}
                      placeholder="e.g. Free local delivery to Naveen Market, Swaroop Nagar, and Civil Lines Kanpur."
                      className="rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Custom Footer Message</label>
                    <Textarea
                      rows={2}
                      value={config.customFooterText ?? ''}
                      onChange={(e) => updateField('customFooterText', e.target.value)}
                      placeholder="Thank you for supporting your local neighborhood store. Quality and freshness guaranteed on every bill."
                      className="rounded-xl text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Real-time Interactive Device Mockup (5 columns) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Live Interactive Preview
            </p>

            <div className="inline-flex rounded-xl border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  device === 'desktop'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="size-3" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  device === 'mobile'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="size-3" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Device Frame */}
          <div
            className={`mx-auto rounded-3xl border border-border/80 bg-background shadow-xl overflow-hidden transition-all duration-300 ${
              device === 'mobile' ? 'max-w-[340px] text-[11px]' : 'w-full text-xs'
            }`}
          >
            {/* Top Device Bar */}
            <div className="bg-muted/70 px-4 py-2 border-b flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500/70" />
                <span className="size-2 rounded-full bg-amber-500/70" />
                <span className="size-2 rounded-full bg-emerald-500/70" />
              </div>
              <span className="truncate font-mono">billwise.io/store/{slug}</span>
              <span className="text-[10px]">🟢 SSL</span>
            </div>

            {/* Simulated Store Announcement */}
            {config.showAnnouncement !== false && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-3 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                <span className="truncate">
                  {config.announcementText || '⚡ Live Catalog & Instant WhatsApp Orders'}
                </span>
                <span className="shrink-0 text-[9px] opacity-80 pl-2">
                  {config.storeTimings || 'Open 8 AM – 10 PM'}
                </span>
              </div>
            )}

            {/* Simulated Store Header */}
            <div className="p-3 border-b flex items-center justify-between gap-2 bg-card">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-8 rounded-lg bg-emerald-600 grid place-items-center text-white shrink-0 shadow-xs">
                  <Store className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate text-xs text-foreground flex items-center gap-1">
                    <span>{businessName}</span>
                    <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{fullAddress || 'Kanpur, UP'}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {phone && (
                  <span className="hidden sm:inline-flex items-center rounded-lg border bg-muted/30 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    📞 {phone}
                  </span>
                )}
                <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs">
                  WhatsApp
                </span>
              </div>
            </div>

            {/* Simulated catalog body */}
            <div className="p-3 space-y-2.5">
              {/* Category pills */}
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                <span className="shrink-0 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-semibold">
                  All
                </span>
                <span className="shrink-0 rounded-full border bg-card px-2.5 py-1 text-[10px] text-muted-foreground">
                  🥤 Beverages
                </span>
                <span className="shrink-0 rounded-full border bg-card px-2.5 py-1 text-[10px] text-muted-foreground">
                  🧈 Oil & Ghee
                </span>
                <span className="shrink-0 rounded-full border bg-card px-2.5 py-1 text-[10px] text-muted-foreground">
                  🌾 Staples
                </span>
              </div>

              {/* Compact product cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { emoji: '🧈', cat: 'Oil & Ghee', name: 'Amul Pure Ghee 1 L', price: '645', stock: '60', unit: 'PKT' },
                  { emoji: '☕', cat: 'Beverages', name: 'Nescafe Classic 50 g', price: '175', stock: '88', unit: 'PKT' },
                ].map((item) => (
                  <div key={item.name} className="overflow-hidden rounded-xl border bg-card">
                    <div className="relative aspect-square bg-muted/30 grid place-items-center">
                      <span className="text-xl">{item.emoji}</span>
                      {config.showLowStockUrgency !== false && Number(item.stock) <= 10 && (
                        <span className="absolute left-1 top-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[8px] font-bold text-black">
                          Low stock
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="truncate text-[9px] text-muted-foreground">{item.cat}</p>
                      <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-foreground">
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        {showPrices ? (
                          <p className="text-[10px] font-bold tabular-nums">₹{item.price}</p>
                        ) : (
                          <p className="text-[9px] font-medium text-primary">Ask price</p>
                        )}
                        <p className="text-[9px] font-medium text-emerald-600">
                          {config.showStockCount !== false ? `${item.stock} ${item.unit} left` : 'In stock'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-600 py-1 text-center text-[9px] font-semibold text-white">
                        {config.orderButtonText?.slice(0, 12) || 'WhatsApp'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
