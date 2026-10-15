import {
  RiFileLine, RiCompassesLine, RiBarChartLine, RiDownloadCloudLine,
  RiCheckDoubleLine, RiCloseCircleLine, RiAlertLine, RiSettings3Line,
  RiSaveLine, RiArrowLeftLine, RiCloseLine, RiPaletteLine, RiCpuLine,
  RiDownload2Line, RiInformationLine, RiRestartLine, RiCheckLine,
  RiEyeLine, RiEyeOffLine, RiDeleteBinLine, RiRobotLine, RiOpenaiFill,
  RiTargetLine, RiGithubLine, RiSearchLine, RiUploadLine,
  RiArrowRightLine, RiFileWord2Line, RiMarkdownLine, RiExchangeLine,
  RiListCheck,
  RiLayoutLine,
  RiLayoutGridLine,
  RiImageLine,
  RiEraserLine,
  RiCheckboxCircleLine,
} from '@remixicon/vue'

const allIcons = [
  RiFileLine, RiCompassesLine, RiBarChartLine, RiDownloadCloudLine,
  RiCheckDoubleLine, RiCloseCircleLine, RiAlertLine, RiSettings3Line,
  RiSaveLine, RiArrowLeftLine, RiCloseLine, RiPaletteLine, RiCpuLine,
  RiDownload2Line, RiInformationLine, RiRestartLine, RiCheckLine,
  RiEyeLine, RiEyeOffLine, RiDeleteBinLine, RiRobotLine, RiOpenaiFill,
  RiTargetLine, RiGithubLine, RiSearchLine, RiUploadLine,
  RiArrowRightLine, RiFileWord2Line, RiMarkdownLine, RiExchangeLine,
  RiListCheck,
]

export default {
  install(app) {
    for (const icon of allIcons) {
      app.component(icon.name, icon)
    }
  }
}
