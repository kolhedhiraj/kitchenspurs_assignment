export default function Loader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`dashboard-loader dashboard-loader-${size}`} aria-hidden="true"><i /><i /><i /></span>;
}
