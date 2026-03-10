import { Suspense } from "react";
import { SearchParamsContext } from "./search-params-wrapper";

export default function AdminPage() {
    return (
        <Suspense fallback={<div>Đang tải Admin...</div>}>
            <SearchParamsContext />
        </Suspense>
    )
}
