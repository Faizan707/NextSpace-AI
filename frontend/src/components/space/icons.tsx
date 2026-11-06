import type { IconType } from 'react-icons'
import {
  FiCalendar,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiList,
  FiMessageSquare,
  FiMoreVertical,
  FiPlus,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi'

function icon(Icon: IconType, size = 16) {
  return function IconComponent() {
    return <Icon size={size} aria-hidden />
  }
}

export const PlusIcon = icon(FiPlus, 14)
export const PencilIcon = icon(FiEdit2, 16)
export const TrashIcon = icon(FiTrash2, 16)
export const DownloadIcon = icon(FiDownload, 16)
export const FileIcon = icon(FiFileText, 18)
export const MoreIcon = icon(FiMoreVertical, 18)
export const CalendarIcon = icon(FiCalendar, 14)
export const GlobeIcon = icon(FiGlobe, 12)
export const ChatBubbleIcon = icon(FiMessageSquare, 16)
export const ProgressIcon = icon(FiList, 14)
export const ProjectsIcon = icon(FiFolder, 14)
export const TeamsIcon = icon(FiUsers, 14)
export const DocumentsIcon = icon(FiFileText, 14)
