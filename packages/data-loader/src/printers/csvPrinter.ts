import {
  KintoneRecordField,
  KintoneFormFieldProperty,
} from "@kintone/rest-api-client";

type KintoneRecord = Record<string, KintoneRecordField.OneOf>;
type KintoneFormFields = {
  properties: { [k: string]: KintoneFormFieldProperty.OneOf };
};

const LINE_BREAK = "\n";
const SEPARATOR = ",";

const isSupportedFieldType = (field: KintoneFormFieldProperty.OneOf) => {
  const supportedFieldTypes = [
    "RECORD_NUMBER",
    "SINGLE_LINE_TEXT",
    "RADIO_BUTTON",
    "MULTI_LINE_TEXT",
    "NUMBER",
    "RICH_TEXT",
    "LINK",
    "DROP_DOWN",
    "CALC",
    "CREATOR",
    "MODIFIER",
    "UPDATED_TIME",
    "CREATED_TIME",
    "MULTI_SELECT",
    "CHECK_BOX",
  ];
  return supportedFieldTypes.includes(field.type);
};

const zeroPad = (num: number) => (num + "").padStart(2, "0");

/**
 * format: "YYYY/MM/DD HH:mm"
 */
const formatDateFieldValue = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}/${zeroPad(date.getMonth() + 1)}/${zeroPad(
    date.getDate()
  )} ${zeroPad(date.getHours())}:${zeroPad(date.getMinutes())}`;
};

const escapeQuotation = (fieldValue: string) => fieldValue.replace(/"/g, '""');

const encloseInQuotation = (fieldValue: string | null) =>
  `"${fieldValue ? escapeQuotation(fieldValue) : ""}"`;

const extractFieldCodes = (fields: KintoneFormFields) => {
  return Object.keys(fields.properties).filter((fieldCode) =>
    isSupportedFieldType(fields.properties[fieldCode])
  );
};

const createRowData = ({
  record,
  fields,
  fieldCodes,
}: {
  record: KintoneRecord;
  fields: KintoneFormFields;
  fieldCodes: string[];
}) => {
  return fieldCodes.reduce<Record<string, string | null>>((row, fieldCode) => {
    const field = record[fieldCode];
    const label = fields.properties[fieldCode].label;
    switch (field.type) {
      case "RECORD_NUMBER":
      case "SINGLE_LINE_TEXT":
      case "RADIO_BUTTON":
      case "MULTI_LINE_TEXT":
      case "NUMBER":
      case "RICH_TEXT":
      case "LINK":
      case "DROP_DOWN":
      case "CALC":
        row[label] = field.value;
        break;
      case "UPDATED_TIME":
      case "CREATED_TIME":
        row[label] = formatDateFieldValue(field.value);
        break;
      case "CREATOR":
      case "MODIFIER":
        row[label] = field.value.code;
        break;
      case "MULTI_SELECT":
      case "CHECK_BOX":
        Object.keys(
          (fields.properties[fieldCode] as
            | KintoneFormFieldProperty.MultiSelect
            | KintoneFormFieldProperty.CheckBox).options
        ).forEach((option) => {
          row[`${label}[${option}]`] = field.value.includes(option) ? "1" : "";
        });
        break;
    }
    return row;
  }, {});
};

export const convertKintoneRecordsToCsv = (
  records: KintoneRecord[],
  fields: KintoneFormFields
) => {
  const fieldCodes = extractFieldCodes(fields);

  const rowsData = records
    .slice()
    .reverse()
    .map((record) => createRowData({ record, fields, fieldCodes }));

  const header = Object.keys(rowsData[0])
    .map((label) => encloseInQuotation(label))
    .join(SEPARATOR);

  const rows = rowsData.map((row) =>
    Object.values(row).map(encloseInQuotation).join(SEPARATOR)
  );

  return (
    [header, ...rows].join(LINE_BREAK).replace(/\r?\n/gm, LINE_BREAK) +
    LINE_BREAK
  );
};

export const csvPrinter = (
  records: KintoneRecord[],
  fields: KintoneFormFields
) => {
  console.log(convertKintoneRecordsToCsv(records, fields));
};
