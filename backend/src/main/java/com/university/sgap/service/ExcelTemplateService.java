package com.university.sgap.service;

import com.university.sgap.dto.BulkImportDtos.ImportRowPreviewDto;
import com.university.sgap.entity.Department;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelTemplateService {

    public static final List<String> STUDENT_COLUMNS = List.of(
            "Register Number",
            "Student Name",
            "Email",
            "Department",
            "Academic Year",
            "Section",
            "Semester"
    );

    public static final List<String> FACULTY_COLUMNS = List.of(
            "Faculty ID",
            "Faculty Name",
            "Email",
            "Department",
            "Designation",
            "Specialization"
    );

    public byte[] generateStudentTemplate(List<Department> departments) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Students");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle textStyle = createTextCellStyle(workbook);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < STUDENT_COLUMNS.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(STUDENT_COLUMNS.get(i));
                cell.setCellStyle(headerStyle);
                sheet.setDefaultColumnStyle(i, textStyle);
            }

            // Sample rows demonstrating leading-zero preservation and valid structure
            writeTextRow(sheet.createRow(1), textStyle, List.of(
                    "0043611901",
                    "Sample Student One",
                    "student.0043611901@university.edu",
                    "Computer Science & Engineering",
                    "2023-2027",
                    "A",
                    "8"
            ));
            writeTextRow(sheet.createRow(2), textStyle, List.of(
                    "436111902",
                    "Sample Student Two",
                    "student.436111902@university.edu",
                    "Information Technology",
                    "2023-2027",
                    "B",
                    "Semester 8"
            ));

            for (int i = 0; i < STUDENT_COLUMNS.size(); i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.max(sheet.getColumnWidth(i) + 600, 4800));
            }

            addInstructionsSheet(
                    workbook,
                    "Student Import Instructions",
                    List.of(
                            "1. Keep exact header names in Row 1: Register Number, Student Name, Email, Department, Academic Year, Section, Semester.",
                            "2. All cells are formatted as Text (@) so leading zeros in Register Numbers (e.g., 0043611901) are preserved.",
                            "3. Valid Semesters: 1 to 8 (or 'Semester 1' to 'Semester 8').",
                            "4. Do NOT include any password column; invited accounts activate via First-Login Password Setup.",
                            "5. Replace or delete the sample rows (Rows 2-3) before uploading your production dataset."
                    ),
                    departments
            );

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateFacultyTemplate(List<Department> departments, Integer adminMaxCapacity) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Faculty");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle textStyle = createTextCellStyle(workbook);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < FACULTY_COLUMNS.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(FACULTY_COLUMNS.get(i));
                cell.setCellStyle(headerStyle);
                sheet.setDefaultColumnStyle(i, textStyle);
            }

            writeTextRow(sheet.createRow(1), textStyle, List.of(
                    "FAC-201",
                    "Dr. Meenakshi Iyer",
                    "meenakshi.iyer@university.edu",
                    "Computer Science & Engineering",
                    "Associate Professor",
                    "Artificial Intelligence & Cloud Systems"
            ));
            writeTextRow(sheet.createRow(2), textStyle, List.of(
                    "FAC-202",
                    "Prof. Sanjay Kulkarni",
                    "sanjay.kulkarni@university.edu",
                    "Electronics & Communication",
                    "Assistant Professor",
                    "VLSI & Embedded IoT"
            ));

            for (int i = 0; i < FACULTY_COLUMNS.size(); i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.max(sheet.getColumnWidth(i) + 600, 5000));
            }

            String capacityNote = (adminMaxCapacity != null && adminMaxCapacity > 0)
                    ? "2. Admin-configured allocation limit is " + adminMaxCapacity + " teams per faculty guide (First-Come, First-Served); do not include custom capacity override columns."
                    : "2. Maximum teams per faculty guide is controlled in Admin Team & Guide Settings; do not include custom capacity override columns.";

            addInstructionsSheet(
                    workbook,
                    "Faculty Import Instructions",
                    List.of(
                            "1. Keep exact header names in Row 1: Faculty ID, Faculty Name, Email, Department, Designation, Specialization.",
                            capacityNote,
                            "3. Do NOT include any password column; invited faculty activate via First-Login Password Setup.",
                            "4. Replace or delete the sample rows (Rows 2-3) before uploading your production dataset."
                    ),
                    departments
            );

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateFailedRecordsWorkbook(String importType, List<ImportRowPreviewDto> failedRows) throws IOException {
        List<String> entityCols = "FACULTY".equalsIgnoreCase(importType) ? FACULTY_COLUMNS : STUDENT_COLUMNS;

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Failed Records");
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle textStyle = createTextCellStyle(workbook);

            Row headerRow = sheet.createRow(0);
            int colIdx = 0;
            createHeaderCell(headerRow, colIdx++, "Row Number", headerStyle);
            createHeaderCell(headerRow, colIdx++, "Failure Category", headerStyle);
            for (String col : entityCols) {
                createHeaderCell(headerRow, colIdx++, col, headerStyle);
            }
            createHeaderCell(headerRow, colIdx, "Validation Errors", headerStyle);

            int rowNum = 1;
            for (ImportRowPreviewDto failed : failedRows) {
                Row row = sheet.createRow(rowNum++);
                int c = 0;
                Cell rowNumCell = row.createCell(c++);
                rowNumCell.setCellValue(failed.rowNumber());

                Cell statusCell = row.createCell(c++);
                statusCell.setCellValue(failed.status());

                for (String col : entityCols) {
                    Cell cell = row.createCell(c++);
                    cell.setCellStyle(textStyle);
                    cell.setCellValue(failed.data() != null ? failed.data().getOrDefault(col, "") : "");
                }

                Cell errCell = row.createCell(c);
                errCell.setCellValue(String.join("; ", failed.errors()));
            }

            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }

    private void addInstructionsSheet(
            XSSFWorkbook workbook,
            String title,
            List<String> notes,
            List<Department> departments
    ) {
        Sheet infoSheet = workbook.createSheet("Instructions");
        Row titleRow = infoSheet.createRow(0);
        CellStyle headerStyle = createHeaderStyle(workbook);
        createHeaderCell(titleRow, 0, title, headerStyle);

        int r = 2;
        for (String note : notes) {
            infoSheet.createRow(r++).createCell(0).setCellValue(note);
        }

        r++;
        infoSheet.createRow(r++).createCell(0).setCellValue("Valid Database Departments (Name or Code accepted):");
        for (Department dept : departments) {
            infoSheet.createRow(r++).createCell(0).setCellValue(dept.getName() + " (" + dept.getCode() + ")");
        }
        infoSheet.setColumnWidth(0, 22000);
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        return style;
    }

    private CellStyle createTextCellStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat fmt = workbook.createDataFormat();
        style.setDataFormat(fmt.getFormat("@"));
        return style;
    }

    private void createHeaderCell(Row row, int idx, String value, CellStyle style) {
        Cell cell = row.createCell(idx);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void writeTextRow(Row row, CellStyle textStyle, List<String> values) {
        for (int i = 0; i < values.size(); i++) {
            Cell cell = row.createCell(i);
            cell.setCellStyle(textStyle);
            cell.setCellValue(values.get(i));
        }
    }
}

