import { Link } from 'react-router-dom'
import {
  BarChart3,
  ShoppingCart,
  Package,
  FileText,
  Zap,
  CheckCircle2,
  ArrowRight,
  Layers,
  Lock,
  ClipboardList,
  UserCog,
  Target,
  FileCheck,
  Truck,
  UserCheck,
  ShoppingBag,
  ClipboardCheck,
  PackageCheck,
  Factory,
  FileSpreadsheet,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Download,
  LayoutDashboard,
  CreditCardIcon,
  Settings,
  ToggleLeft,
  Gauge,
  Database,
  MapPin,
} from 'lucide-react'

const featureCategories = [
  {
    id: 'core',
    name: 'Core Platform',
    description: 'Enterprise-grade foundation built for scale and security',
    icon: Layers,
    color: 'from-blue-500 to-blue-600',
    features: [
      {
        name: 'Role-Based Access Control',
        description: 'Granular permission system with customizable roles, ensuring users only access what they need.',
        icon: Lock,
      },
      {
        name: 'Audit Logs',
        description: 'Complete audit trail of all system activities for compliance, security monitoring, and accountability.',
        icon: ClipboardList,
      },
      {
        name: 'User Management',
        description: 'Comprehensive user administration with invitation system, profile management, and activity tracking.',
        icon: UserCog,
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'End-to-end sales cycle management from lead to cash',
    icon: ShoppingCart,
    color: 'from-purple-500 to-purple-600',
    features: [
      {
        name: 'Lead Management',
        description: 'Capture, qualify, and convert leads with pipeline tracking and conversion analytics.',
        icon: Target,
      },
      {
        name: 'Quotations',
        description: 'Create professional quotes with product catalogs, pricing rules, and approval workflows.',
        icon: FileCheck,
      },
      {
        name: 'Sales Orders',
        description: 'Process sales orders with inventory allocation, backorder management, and order status tracking.',
        icon: ShoppingBag,
      },
      {
        name: 'Sales Invoicing',
        description: 'Generate invoices from orders with automatic pricing, discounts, and tax calculations.',
        icon: FileSpreadsheet,
      },
      {
        name: 'Delivery Tracking',
        description: 'Track shipments, manage delivery schedules, and update customers on order status.',
        icon: Truck,
      },
      {
        name: 'Customer Ledger',
        description: 'Complete customer transaction history with statements, credit limits, and payment terms.',
        icon: UserCheck,
      },
    ],
  },
  {
    id: 'procurement',
    name: 'Procurement',
    description: 'Streamlined purchasing with complete vendor management',
    icon: FileText,
    color: 'from-orange-500 to-orange-600',
    features: [
      {
        name: 'Purchase Requests',
        description: 'Internal purchase requisitions with approval workflows and budget validation.',
        icon: ClipboardCheck,
      },
      {
        name: 'Purchase Orders',
        description: 'Create POs from requests or directly, with vendor price comparison and order tracking.',
        icon: ShoppingCart,
      },
      {
        name: 'Goods Receipt',
        description: 'Record goods received against POs with quality checks and variance reporting.',
        icon: PackageCheck,
      },
      {
        name: 'Vendor Management',
        description: 'Maintain vendor database with contact info, payment terms, and performance ratings.',
        icon: Factory,
      },
      {
        name: 'Vendor Invoices',
        description: 'Process vendor bills with PO matching, approval workflows, and payment scheduling.',
        icon: FileSpreadsheet,
      },
      {
        name: '3-Way Matching',
        description: 'Automated matching of PO, goods receipt, and invoice for accurate payment processing.',
        icon: CheckCircle2,
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Real-time stock control and warehouse management',
    icon: Package,
    color: 'from-indigo-500 to-indigo-600',
    features: [
      {
        name: 'Stock In/Out',
        description: 'Record all stock movements with reason codes, lot tracking, and automatic valuations.',
        icon: Package,
      },
      {
        name: 'Warehouse Management',
        description: 'Manage multiple warehouses with location tracking, bin management, and transfer orders.',
        icon: Warehouse,
      },
      {
        name: 'Stock Valuation',
        description: 'Multiple valuation methods (FIFO, LIFO, Average) with real-time cost tracking.',
        icon: BarChart3,
      },
      {
        name: 'Reorder Alerts',
        description: 'Automated alerts when stock falls below reorder points with suggested order quantities.',
        icon: AlertTriangle,
      },
      {
        name: 'Stock Reports',
        description: 'Comprehensive inventory reports including aging, turnover, and dead stock analysis.',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics',
    description: 'Track deliveries, distances, and product movements',
    icon: Truck,
    color: 'from-green-500 to-green-600',
    features: [
      {
        name: 'Delivery Tracking',
        description: 'Record and track all deliveries with order references, products, and distances.',
        icon: MapPin,
      },
      {
        name: 'Distance Analytics',
        description: 'Analyze delivery distances by product, time period, and route optimization insights.',
        icon: TrendingUp,
      },
      {
        name: 'Quantity Tracking',
        description: 'Track quantities delivered with aggregations by product, month, and distance range.',
        icon: Package,
      },
      {
        name: 'Logistics Dashboard',
        description: 'Visual dashboards with charts showing delivery trends, top products, and distance analysis.',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'reporting',
    name: 'Reporting',
    description: 'Powerful analytics and business intelligence tools',
    icon: PieChart,
    color: 'from-pink-500 to-pink-600',
    features: [
      {
        name: 'Sales Reports',
        description: 'Sales analytics by product, customer, region, and time period with trend analysis.',
        icon: TrendingUp,
      },
      {
        name: 'Inventory Reports',
        description: 'Stock levels, movements, valuations, and forecasting reports.',
        icon: Package,
      },
      {
        name: 'Export to Excel/PDF',
        description: 'Export any report to Excel or PDF with formatting preserved for sharing.',
        icon: Download,
      },
      {
        name: 'Role-Based Dashboards',
        description: 'Customizable dashboards tailored to different roles with relevant KPIs and metrics.',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'saas',
    name: 'SaaS Features',
    description: 'Enterprise-grade platform capabilities for growth',
    icon: Zap,
    color: 'from-cyan-500 to-cyan-600',
    features: [
      {
        name: 'Subscription Billing',
        description: 'Flexible subscription management with multiple billing cycles and payment methods.',
        icon: CreditCardIcon,
      },
      {
        name: 'Plan Management',
        description: 'Define and manage subscription tiers with different feature sets and pricing.',
        icon: Settings,
      },
      {
        name: 'Feature Toggles',
        description: 'Enable or disable features per plan or customer for granular access control.',
        icon: ToggleLeft,
      },
      {
        name: 'Usage Limits',
        description: 'Set and monitor usage quotas for users, transactions, storage, and API calls.',
        icon: Gauge,
      },
      {
        name: 'Backup Strategy',
        description: 'Automated backups with point-in-time recovery and disaster recovery options.',
        icon: Database,
      },
    ],
  },
]

export default function Features() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-primary-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="container-custom section-padding relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Powerful Features for{' '}
              <span className="gradient-text">Every Business Need</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the comprehensive suite of tools that make AppSire ERP the complete solution 
              for managing your entire business operation.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-white border-b border-gray-100 sticky top-[73px] z-40">
        <div className="container-custom px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-1 py-2 scrollbar-hide">
            {featureCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg whitespace-nowrap transition-colors"
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, categoryIndex) => (
        <section
          key={category.id}
          id={category.id}
          className={`section-padding ${categoryIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
        >
          <div className="container-custom">
            {/* Category Header */}
            <div className="flex items-start gap-4 mb-12">
              <div className={`w-14 h-14 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <category.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {category.name}
                </h2>
                <p className="text-gray-600 text-lg">{category.description}</p>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.features.map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                      <feature.icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{feature.name}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Integration Section */}
      <section className="section-padding bg-primary-600">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
              Built for Integration
            </h2>
            <p className="text-lg text-primary-100 mb-8">
              AppSire ERP is designed to work seamlessly with your existing tools. 
              Connect with payment gateways, shipping providers, and more.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['REST API', 'Webhooks', 'CSV Import/Export', 'Custom Integrations'].map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
                Ready to experience these features?
              </h2>
              <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                Connect with us today and discover how AppSire ERP can transform your business operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/connect" className="btn-primary bg-white !text-gray-900 hover:bg-gray-100">
                  Connect with Us
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
