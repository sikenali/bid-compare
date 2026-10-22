import {
  RiFileLine, RiFileWordLine, RiFilePdfLine, RiFileExcelLine, RiFileTextLine,
  RiFileWord2Line, RiFileExcel2Line, RiSlideshow2Line, RiFilePdf2Line,
  RiCloseCircleLine, RiAlertLine, RiSettings3Line, RiArrowLeftLine, RiCloseLine,
  RiArrowLeftSLine, RiDownload2Line, RiDownloadLine,
  RiInformationLine, RiRestartLine, RiCheckLine,
  RiEyeLine, RiEyeOffLine, RiDeleteBinLine, RiRobotLine, RiOpenaiFill,
  RiTargetLine, RiGithubLine, RiSearchLine, RiUploadLine, RiUploadCloud2Line,
  RiArrowRightLine, RiAddLine, RiArrowRightSLine, RiRobot2Line,
  RiMarkdownLine, RiExchangeLine, RiExchange2Line, RiListCheck,
  RiLayoutLine, RiLayoutGridLine, RiImageLine, RiEraserLine,
  RiCheckboxCircleLine, RiPercentLine, RiTableLine, RiArrowDownSLine,
  RiPaletteLine, RiCpuLine,
  RiCloseCircleFill, RiLoader4Line, RiEditLine, RiFileEditLine,
  RiBookOpenLine,
} from '@remixicon/vue'

const allIcons = [
  RiFileLine, RiFileWordLine, RiFilePdfLine, RiFileExcelLine, RiFileTextLine,
  RiFileWord2Line, RiFileExcel2Line, RiSlideshow2Line, RiFilePdf2Line,
  RiCloseCircleLine, RiAlertLine, RiSettings3Line, RiArrowLeftLine, RiCloseLine,
  RiArrowLeftSLine, RiDownload2Line, RiDownloadLine,
  RiInformationLine, RiRestartLine, RiCheckLine,
  RiEyeLine, RiEyeOffLine, RiDeleteBinLine, RiRobotLine, RiOpenaiFill,
  RiTargetLine, RiGithubLine, RiSearchLine, RiUploadLine, RiUploadCloud2Line,
  RiArrowRightLine, RiAddLine, RiArrowRightSLine, RiRobot2Line,
  RiMarkdownLine, RiExchangeLine, RiExchange2Line, RiListCheck,
  RiLayoutLine, RiLayoutGridLine, RiImageLine, RiEraserLine,
  RiCheckboxCircleLine, RiPercentLine, RiTableLine, RiArrowDownSLine,
  RiPaletteLine, RiCpuLine,
  RiCloseCircleFill, RiLoader4Line, RiEditLine, RiFileEditLine,
  RiBookOpenLine,
]

export default {
  install(app) {
    for (const icon of allIcons) {
      app.component(icon.name, icon)
    }
  }
}
