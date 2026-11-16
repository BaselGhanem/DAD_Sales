# تجهيز التارجت

ارفع ملف التارجت عندما يصبح جاهزا في المسار `data/Targets.xlsx` (وليس داخل هذا المجلد)

اسم الصفحة: `Data`

الاعمدة بالضبط:

| MR | Item Name | Year | Month | Value | Units |
| --- | --- | --- | --- | --- | --- |

- MR يطابق اسم المندوب في المبيعات
- Item Name يطابق اسم الصنف في المبيعات
- Year سنة التارجت، Month رقم الشهر 1–12
- Value تارجت القيمة، Units تارجت الوحدات
- صف واحد فقط لكل مندوب وصنف وسنة وشهر
- الارقام غير سالبة
- التارجت والفعلي في قسم التارجت للشهور الكاملة المختارة، ولا يتاثران بفلتر المنطقة او العميل
- فلاتر الصنف ومجموعة المنتج والفريق والشهر تطبق على القسم
- لا يظهر قسم التارجت اذا الملف غير موجود او لا توجد اهداف مطابقة للمندوب والفترة والاصناف

## 2026 Sales vs Target

- Download `targets/Target-2026-Template.xlsx`.
- Fill in the `Area` worksheet and publish the result as `data/target.xlsx`.
- Check the published file via `secure/` → Target workbook checks. The representative comparison waits until the file passes validation.
- The full workbook is downloadable from the public repository.
