// vim: sts=2 sw=2 ts=2 expandtab

/*
 * 編成最適化関連
 */
import React, { Component } from "react";
import CSSModules from "react-css-modules";
import { connect } from "react-redux";

import {
  enable_weapon_object,
  disable_weapon_object,
  enable_summon_object,
  disable_summon_object,
  enable_friend_object,
  disable_friend_object,
  sort_weapon_object,
  sort_summon_object,
  sort_friend_object,
  input_lock,
  input_unlock
} from "./actions.js";

import { WORKER_STATE, WORKER_COMMAND } from "./const/worker_type.js";
import { WEAPON_CHECKED_MAX, SUMMON_CHECKED_MAX, FRIEND_CHECKED_MAX } from "./const/number_const.js";

import styles from "optimizer.css";



// 最適化をまとめるセクション
class Optimizer extends Component {
  constructor() {
    super();
    this.state = {
      max_gen: 300,
      max_pop: 500,
      mut_prob: 0.08,
      percent: 0,
      running: false
    };
    this.on_message = ::this.on_message;
    this.optimizer_func = ::this.optimizer_func;
  }

  componentDidMount() {
    // 最適化用のWebWorkerを読み込み
    this.optimize_worker = new Worker("./dist/optimizer.js");  // Webpackのコンフィグ参照
    // イベントリスナーを追加
    this.optimize_worker.addEventListener("message", this.on_message);
    this.optimize_worker.postMessage({ command: WORKER_COMMAND.GET_STATE });
  }

  componentWillUnmount() {
    this.optimize_worker.removeEventListener("message", this.on_message);
    this.optimize_worker.terminate();
    this.optimize_worker = undefined;
  }

  on_message(e) {
    if (e.data.state === WORKER_STATE.RUNNING) {
      this.setState({ percent: e.data.percent });
    }
    if (e.data.state === WORKER_STATE.STOP && e.data.can_run) {
      console.log(e.data);
      this.setState({ percent: 0 });
      this.optimize_worker.postMessage({
        command: WORKER_COMMAND.INIT
      });
      this.optimize_worker.postMessage({ command: WORKER_COMMAND.RUN });
    }
    if (e.data.state === WORKER_STATE.FINISH) {
      console.info(e.data);
      // 結果を格納する
      let target = {
        weapon: e.data.weapon,
        summon: e.data.summon,
        friend: e.data.friend
      };
      // 一度選択状態を解除する
      this.props.weapon.forEach((v, i) => {
        this.props.disable_weapon_object(i);
      });
      this.props.summon.forEach((v, i) => {
        this.props.disable_summon_object(i);
      });
      this.props.friend.forEach((v, i) => {
        this.props.disable_friend_object(i);
      });
      // 指定された順番に並びかえる
      this.props.sort_weapon_object(target.weapon);
      this.props.sort_summon_object(target.summon);
      this.props.sort_friend_object(target.friend);
      // 一番上から選択状態にする
      [...Array(WEAPON_CHECKED_MAX).keys()].forEach((v, i) => {
        this.props.enable_weapon_object(i);
      });
      [...Array(SUMMON_CHECKED_MAX).keys()].forEach((v, i) => {
        this.props.enable_summon_object(i);
      });
      [...Array(FRIEND_CHECKED_MAX).keys()].forEach((v, i) => {
        this.props.enable_friend_object(i);
      });
      this.optimize_worker.postMessage({
        command: WORKER_COMMAND.RESET
      });
      this.props.input_unlock();
      this.setState({ gen_count: 0 });
      this.setState({ running: false });
    }
  }

  optimizer_func() {
    this.props.input_lock();
    this.setState({ running : true });
    this.optimize_worker.postMessage({
      command: WORKER_COMMAND.SET_BASIC_INFO,
      data: this.props.basicinfo
    });
    this.optimize_worker.postMessage({
      command: WORKER_COMMAND.SET_WEAPON,
      data: this.props.weapon
    });
    this.optimize_worker.postMessage({
      command: WORKER_COMMAND.SET_SUMMON,
      data: this.props.summon
    });
    this.optimize_worker.postMessage({
      command: WORKER_COMMAND.SET_FRIEND,
      data: this.props.friend
    });
    this.optimize_worker.postMessage({
      command: WORKER_COMMAND.SET_GA_PARAM,
      data: {
        generation: this.state.max_gen,
        population: this.state.max_pop,
        mutation_probability: { all: this.state.mut_prob }
      }
    });
    this.optimize_worker.postMessage({ command: WORKER_COMMAND.GET_STATE });
  }

  render() {
    return (
      <section>
        <header styleName="title">編成最適化</header>
        <form name="optimizer">
          <table styleName="base" id="optimizer_table">
            <Button
              optimizer_func={ this.optimizer_func }
              value={ this.state.running ? "実行中" : "停止" }
              disabled={ this.state.running ? false : true }
              max={ 100 }
              count={ this.state.percent }
              />
          </table>
        </form>
      </section>
    );
  }
}
Optimizer = CSSModules(Optimizer, styles);
const mapStateToOptimizerProps = (state) => {
  return {
    weapon: state.weapon,
    summon: state.summon,
    friend: state.friend,
    basicinfo: state.basicinfo
  };
};
const mapActionCreatorsToOptimizerProps = {
  enable_weapon_object,
  disable_weapon_object,
  sort_weapon_object,
  enable_summon_object,
  disable_summon_object,
  sort_summon_object,
  enable_friend_object,
  disable_friend_object,
  sort_friend_object,
  input_lock,
  input_unlock
};
Optimizer = connect(mapStateToOptimizerProps, mapActionCreatorsToOptimizerProps)(Optimizer);
export default Optimizer;


class Button extends Component {
  constructor(props) {
    super(props);
    this.start_button = ::this.start_button;
    this.state = {};
  }

  start_button(event) {
    this.props.optimizer_func();
  }

  render() {
    return (
      <tbody>
        <tr styleName="row">
          <th styleName="header">
            ぼたん
          </th>
          <td>
            <input type="button" value={this.props.value} onClick={this.start_button} />
            <progress
              max={this.props.max}
              value={this.props.count}
            >
              進捗
            </progress>
          </td>
        </tr>
      </tbody>
    );
  }
}
Button = CSSModules(Button, styles);
