import Amplify, { API } from "aws-amplify";
import awsconfig from "./aws-exports";
import * as mutations from "./graphql/mutations";
import XLSX from "xlsx";
import { Person } from "./models";
interface ExcelResult {
  surveyPosition: string;
  currentOffice: string;
  wishOffice: string;
  officesWorkedIn: string;
  hasPet: string;
  pet: string;
  superheroAbility: string | undefined;
  projectFantasyName: string | undefined;
  jobForOneDay: string | undefined;
  newHobby: string | undefined;
  pizzaEstimate: string | undefined;
  wishForNextBereichsseminar: string | undefined;
  productIdea: string | undefined;
}

interface TransformedExcelResult {
  hasPet: boolean;
  pet: string;
  officesWorkedIn: string[] | null;
  surveyPosition: string;
  currentOffice: string;
  wishOffice: string;
  superheroAbility: string | undefined;
  projectFantasyName: string | undefined;
  jobForOneDay: string | undefined;
  newHobby: string | undefined;
  pizzaEstimate: string | undefined;
  wishForNextBereichsseminar: string | undefined;
  productIdea: string | undefined;
}

Amplify.configure(awsconfig);

const workbook = XLSX.readFile("facts.xlsx");
const sheet_name_list = workbook.SheetNames;
const xlData = XLSX.utils.sheet_to_json(
  workbook.Sheets[sheet_name_list[0]]
) as ExcelResult[];

const transformedExcelResult = xlData.map((excelRow) => {
  return {
    ...excelRow,
    hasPet: excelRow.hasPet === "Yes" ? true : false,
    pet: excelRow.pet ? excelRow.pet : null,
    officesWorkedIn: excelRow.officesWorkedIn
      ? excelRow.officesWorkedIn.replace("\r\n", "").slice(0, -1).split(";")
      : null,
  };
});

const importPersons = async (
  transformedExcelResult: TransformedExcelResult[]
) => {
  try {
    transformedExcelResult.forEach(
      async ({
        surveyPosition,
        currentOffice,
        wishOffice,
        superheroAbility,
        projectFantasyName,
        jobForOneDay,
        newHobby,
        pizzaEstimate,
        wishForNextBereichsseminar,
        productIdea,
        pet,
        officesWorkedIn,
      }) => {
        const newPerson = (await API.graphql({
          query: mutations.createPerson,
          variables: {
            input: {
              surveyPosition: parseInt(surveyPosition),
              currentOffice,
              wishOffice,
              superheroAbility,
              projectFantasyName,
              jobForOneDay,
              newHobby,
              pizzaEstimate: parseInt(pizzaEstimate),
              wishForNextBereichsseminar,
              productIdea,
            },
          },
        })) as { data: { createPerson: Person } };

        console.log("NewPersonID", newPerson.data.createPerson.id);

        if (pet) {
          await API.graphql({
            query: mutations.createPet,
            variables: {
              input: { kind: pet, personID: newPerson.data.createPerson.id },
            },
          });
        }

        officesWorkedIn.forEach(async (officeWorkedIn) => {
          await API.graphql({
            query: mutations.createOfficeWorkedIn,
            variables: {
              input: {
                name: officeWorkedIn,
                personID: newPerson.data.createPerson.id,
              },
            },
          });
        });
      }
    );
  } catch (error) {
    console.log(error);
  }
};

const importData = async () => {
  await importPersons(transformedExcelResult);
};

importData();
