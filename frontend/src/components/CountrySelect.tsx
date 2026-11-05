import { getData } from 'country-list'
import Select, { components } from 'react-select'
import type { GroupBase, OptionProps, SingleValueProps, StylesConfig } from 'react-select'

export type CountryOption = {
  value: string
  label: string
}

const countryOptions: CountryOption[] = getData()
  .map((country) => ({ value: country.code, label: country.name }))
  .sort((a, b) => a.label.localeCompare(b.label))

function Flag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/40x30/${code.toLowerCase()}.png 2x`}
      width={20}
      height={15}
      alt=""
      className="rounded-[2px] object-cover"
    />
  )
}

function Option(props: OptionProps<CountryOption, false, GroupBase<CountryOption>>) {
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2.5">
        <Flag code={props.data.value} />
        <span>{props.data.label}</span>
      </div>
    </components.Option>
  )
}

function SingleValue(props: SingleValueProps<CountryOption, false, GroupBase<CountryOption>>) {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2.5">
        <Flag code={props.data.value} />
        <span>{props.data.label}</span>
      </div>
    </components.SingleValue>
  )
}

const selectStyles: StylesConfig<CountryOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 52,
    borderRadius: 14,
    background: '#ffffff',
    borderColor: state.isFocused ? 'rgba(37, 99, 235, 0.45)' : 'var(--color-line)',
    boxShadow: state.isFocused ? '0 0 0 3px var(--color-accent-soft)' : 'none',
    ':hover': {
      borderColor: state.isFocused ? 'rgba(37, 99, 235, 0.45)' : '#d1d5db',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: 14,
    paddingRight: 8,
  }),
  menu: (base) => ({
    ...base,
    background: '#ffffff',
    border: '1px solid var(--color-line)',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
    zIndex: 30,
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: 240,
    padding: 6,
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: 10,
    background: state.isSelected
      ? 'var(--color-accent-soft)'
      : state.isFocused
        ? '#f3f4f6'
        : 'transparent',
    color: 'var(--color-ink)',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--color-ink)', margin: 0 }),
  input: (base) => ({ ...base, color: 'var(--color-ink)' }),
  placeholder: (base) => ({ ...base, color: 'var(--color-placeholder)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--color-muted)' }),
}

interface CountrySelectProps {
  value: CountryOption | null
  onChange: (option: CountryOption | null) => void
  required?: boolean
  inputId?: string
  label?: string
}

export function CountrySelect({
  value,
  onChange,
  required = false,
  inputId = 'country',
  label = 'Country',
}: CountrySelectProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink/80">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <Select<CountryOption, false>
        inputId={inputId}
        options={countryOptions}
        value={value}
        onChange={onChange}
        placeholder="Select country"
        isClearable
        isSearchable
        styles={selectStyles}
        components={{ Option, SingleValue }}
        classNamePrefix="country-select"
        aria-required={required}
      />
    </div>
  )
}
