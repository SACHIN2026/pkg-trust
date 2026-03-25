interface PackageReport {
    name: string;
    score: number;
    flags: string[];
    verdict: "SAFE" | "SUSPICIOUS" | "DANGER";
}
declare function checkPackage(name: string): Promise<PackageReport>;

export { checkPackage };
