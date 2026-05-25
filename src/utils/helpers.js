import { format } from "date-fns";

export function formatDate(iso) {
  return format(new Date(iso), "PPp");
}

export function getInitials(name) {
  return (name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getDomain(email) {
  return email?.split("@")[1] || "";
}
