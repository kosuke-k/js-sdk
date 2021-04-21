import { formatToRecordValue } from "./formatToRecordValue";
import { CsvRows, FieldsJson } from "../../types";
import { KintoneFormFieldProperty } from "@kintone/rest-api-client";

export const extractSubTableFieldsValue = ({
  rows,
  fieldsJson,
}: {
  rows: CsvRows;
  fieldsJson: FieldsJson;
}) => {
  const subtableFieldProperties = Object.keys(fieldsJson.properties)
    .filter((fieldCode) => fieldsJson.properties[fieldCode].type === "SUBTABLE")
    .map(
      (fieldCode) =>
        fieldsJson.properties[
          fieldCode
        ] as KintoneFormFieldProperty.Subtable<any>
    );

  return subtableFieldProperties.reduce(
    (subtableFieldValue, subtableFieldProperty) => {
      return {
        ...subtableFieldValue,
        [subtableFieldProperty.code]: extractInSubtableFieldValue(
          rows,
          subtableFieldProperty
        ),
      };
    },
    {}
  );
};

type InSubtableFieldValue = Record<
  string,
  { value: string } | { value: { code: string } } | { value: string[] }
>;

const extractInSubtableFieldValue = (
  rows: CsvRows,
  subtableFieldProperty: KintoneFormFieldProperty.Subtable<any>
) => {
  return {
    value: rows.map((row) => {
      return {
        id: row[subtableFieldProperty.code],
        value: Object.keys(
          subtableFieldProperty.fields
        ).reduce<InSubtableFieldValue>(
          (inSubtableFieldValue, inSubtableFieldCode) => {
            if (!row[inSubtableFieldCode]) return inSubtableFieldValue;
            return {
              ...inSubtableFieldValue,
              [inSubtableFieldCode]: formatToRecordValue({
                fieldType:
                  subtableFieldProperty.fields[inSubtableFieldCode].type,
                value: row[inSubtableFieldCode],
              }),
            };
          },
          {}
        ),
      };
    }),
  };
};
