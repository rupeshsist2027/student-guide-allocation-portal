package com.university.sgap.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.util.XMLHelper;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class SpreadsheetParserService {

    public record ParsedRow(int rowNumber, List<String> cells) {}

    public record ParsedSheet(List<String> headers, List<ParsedRow> rows) {}

    public ParsedSheet parseFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a non-empty .xlsx or .csv file.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String lowerName = originalFilename.toLowerCase(Locale.ROOT).trim();

        if (lowerName.endsWith(".xlsx")) {
            return parseXlsxStreaming(file);
        }
        if (lowerName.endsWith(".csv")) {
            return parseCsv(file);
        }

        throw new IllegalArgumentException(
                "Unsupported file format \"" + originalFilename + "\". Only Excel (.xlsx) and CSV (.csv) files are supported."
        );
    }

    private ParsedSheet parseXlsxStreaming(MultipartFile file) {
        List<ParsedRow> allRows = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream();
             OPCPackage opcPackage = OPCPackage.open(inputStream)) {

            ReadOnlySharedStringsTable sharedStrings = new ReadOnlySharedStringsTable(opcPackage, false);
            XSSFReader xssfReader = new XSSFReader(opcPackage);
            StylesTable stylesTable = xssfReader.getStylesTable();
            XSSFReader.SheetIterator sheetIterator = (XSSFReader.SheetIterator) xssfReader.getSheetsData();

            if (!sheetIterator.hasNext()) {
                throw new IllegalArgumentException("The uploaded Excel workbook contains no sheets.");
            }

            try (InputStream sheetStream = sheetIterator.next()) {
                DataFormatter formatter = new DataFormatter(Locale.US);
                formatter.setUseCachedValuesForFormulaCells(true);

                StreamingSheetHandler sheetHandler = new StreamingSheetHandler(allRows);
                XSSFSheetXMLHandler xmlHandler = new XSSFSheetXMLHandler(
                        stylesTable,
                        null,
                        sharedStrings,
                        sheetHandler,
                        formatter,
                        false
                );

                XMLReader xmlReader = XMLHelper.newXMLReader();
                xmlReader.setContentHandler(xmlHandler);
                xmlReader.parse(new InputSource(sheetStream));
            }
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to read Excel (.xlsx) file: " + ex.getMessage(), ex);
        }

        return extractHeadersAndDataRows(allRows);
    }

    private ParsedSheet parseCsv(MultipartFile file) {
        List<ParsedRow> allRows = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)
        )) {
            reader.mark(1);
            int firstChar = reader.read();
            if (firstChar != 0xFEFF && firstChar != -1) {
                reader.reset();
            }

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setIgnoreSurroundingSpaces(false)
                    .setIgnoreEmptyLines(true)
                    .build();

            try (CSVParser csvParser = new CSVParser(reader, format)) {
                for (CSVRecord record : csvParser) {
                    int rowNumber = (int) record.getRecordNumber();
                    List<String> cells = new ArrayList<>(record.size());
                    for (int i = 0; i < record.size(); i++) {
                        cells.add(cleanCellValue(record.get(i)));
                    }
                    if (!isCompletelyBlankRow(cells)) {
                        allRows.add(new ParsedRow(rowNumber, cells));
                    }
                }
            }
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to read CSV (.csv) file: " + ex.getMessage(), ex);
        }

        return extractHeadersAndDataRows(allRows);
    }

    private ParsedSheet extractHeadersAndDataRows(List<ParsedRow> allRows) {
        if (allRows.isEmpty()) {
            throw new IllegalArgumentException("The uploaded file is empty.");
        }

        ParsedRow headerRow = allRows.get(0);
        List<String> headers = new ArrayList<>(headerRow.cells().size());
        for (String cell : headerRow.cells()) {
            headers.add(cleanCellValue(cell));
        }

        List<ParsedRow> dataRows = new ArrayList<>();
        for (int i = 1; i < allRows.size(); i++) {
            ParsedRow row = allRows.get(i);
            if (!isCompletelyBlankRow(row.cells())) {
                dataRows.add(row);
            }
        }

        return new ParsedSheet(headers, dataRows);
    }

    private static String cleanCellValue(String raw) {
        if (raw == null) {
            return "";
        }
        // Only trim whitespace; never modify digits or strip leading zeros.
        return raw.trim();
    }

    private static boolean isCompletelyBlankRow(List<String> cells) {
        for (String cell : cells) {
            if (cell != null && !cell.trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private static final class StreamingSheetHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final List<ParsedRow> outputRows;
        private int currentRowIndex = -1;
        private int currentColIndex = -1;
        private List<String> currentCells = new ArrayList<>();

        private StreamingSheetHandler(List<ParsedRow> outputRows) {
            this.outputRows = outputRows;
        }

        @Override
        public void startRow(int rowNum) {
            this.currentRowIndex = rowNum;
            this.currentColIndex = -1;
            this.currentCells = new ArrayList<>();
        }

        @Override
        public void endRow(int rowNum) {
            if (!isCompletelyBlankRow(currentCells)) {
                outputRows.add(new ParsedRow(rowNum + 1, currentCells));
            }
        }

        @Override
        public void cell(String cellReference, String formattedValue, XSSFComment comment) {
            int colIdx;
            if (cellReference != null) {
                colIdx = new CellReference(cellReference).getCol();
            } else {
                colIdx = currentColIndex + 1;
            }
            while (currentCells.size() < colIdx) {
                currentCells.add("");
            }
            currentCells.add(cleanCellValue(formattedValue));
            currentColIndex = colIdx;
        }
    }
}

