#!/bin/bash
# Run this from your repo root: bash create-placeholder-routes.sh
# Creates all missing route page files so nothing crashes while we build

PLACEHOLDER='import { PlaceholderPage } from "@/shared/components/ui/PlaceholderPage";
export default function Page() {
  return <PlaceholderPage title="TITLE" />;
}'

create_page() {
  local path="apps/web/app/(dashboard)/$1/page.tsx"
  local title="$2"
  mkdir -p "$(dirname "$path")"
  if [ ! -s "$path" ]; then
    echo "${PLACEHOLDER/TITLE/$title}" > "$path"
    echo "✓ Created $path"
  else
    echo "— Exists  $path"
  fi
}

# ADMIN routes
# create_page "admin/projects"   "Projects"
# create_page "admin/team"       "Team"
# create_page "admin/clients"    "Clients"
# create_page "admin/invoices"   "Invoices"
# create_page "admin/documents"  "Documents"
# create_page "admin/activity"   "Activity"
# create_page "admin/managers"   "Managers"
# create_page "admin/billing"    "Billing"

# MANAGER routes
create_page "manager/projects"  "Projects"
create_page "manager/team"      "Team"
create_page "manager/documents" "Documents"
create_page "manager/activity"  "Activity"
create_page "manager/content"   "Content"

# DEVELOPER routes
create_page "developer"          "Overview"
create_page "developer/projects" "Projects"
create_page "developer/documents" "Documents"
create_page "developer/activity"  "Activity"

# CLIENT routes
create_page "client"            "Overview"
create_page "client/projects"   "Projects"
create_page "client/documents"  "Documents"
create_page "client/invoices"   "Invoices"

echo ""
echo "✅ All placeholder routes created"




# Function to create page if it doesn't have content run this script directly
create_page() {
  local file="apps/web/app/(dashboard)/$1/page.tsx"
  mkdir -p "$(dirname "$file")"
  cat > "$file" << EOF
import { PlaceholderPage } from "@/shared/components/ui/PlaceholderPage";
export default function Page() {
  return <PlaceholderPage title="$2" />;
}
EOF
  echo "✓ $file"
}


create_page "manager/projects"  "Projects"
create_page "manager/team"      "Team"
create_page "manager/documents" "Documents"
create_page "manager/activity"  "Activity"
create_page "developer"         "Overview"
create_page "developer/projects"  "Projects"
create_page "developer/documents" "Documents"
create_page "developer/activity"  "Activity"
create_page "client"            "Overview"
create_page "client/projects"   "Projects"
create_page "client/documents"  "Documents"
create_page "client/invoices"   "Invoices"