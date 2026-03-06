import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useRetailer } from "@/hooks/use-retailer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Retailer() {
  const { retailer, isLoading, updateRetailer, isUpdating } = useRetailer();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");

  useEffect(() => {
    if (retailer) {
      setName(retailer.name ?? "");
      setAddress(retailer.address ?? "");
      setCity(retailer.city ?? "");
      setState(retailer.state ?? "");
      setPinCode(retailer.pinCode ?? "");
      setCountry(retailer.country ?? "");
      setGstin(retailer.gstin ?? "");
      setPan(retailer.pan ?? "");
    }
  }, [retailer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRetailer(
      {
        name: name.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pinCode: pinCode.trim() || undefined,
        country: country.trim() || undefined,
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
      },
      {
        onSuccess: () => toast({ title: "Saved", description: "Retailer details updated" }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold">Retailer</h2>
          <p className="text-muted-foreground">Business details used as &quot;From&quot; on order print</p>
        </div>

        <Card className="shadow-lg shadow-black/5 border-border/50">
          <CardHeader>
            <CardTitle>Retailer details</CardTitle>
            <p className="text-sm text-muted-foreground">Address, GSTIN and PAN will appear on printed orders.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Silverline Techno Management Services"
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address"
                    className="max-w-md"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pin code</label>
                    <Input value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="Pin code" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">GSTIN</label>
                    <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="GSTIN" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">PAN</label>
                    <Input value={pan} onChange={(e) => setPan(e.target.value)} placeholder="PAN" />
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save retailer details
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
