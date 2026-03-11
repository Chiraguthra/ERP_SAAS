import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RateEnquiryButton } from "@/components/RateEnquiryButton";

export default function RateEnquiry() {
  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Freight / Rate Enquiry</CardTitle>
          </CardHeader>
          <CardContent>
            <RateEnquiryButton defaultOpen />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

